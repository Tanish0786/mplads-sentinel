"""Runs real anomaly-detection logic on the MP-level MPLADS allocation
data in data/raw/mp_allocations.json (pulled live from the official
MPLADS dashboard), and writes:

  web/public/data/summary.json  — headline stats + severity counts
  web/public/data/cases.json    — one row per flag raised (flat, for the
                                    Anomalies table)
  web/public/data/mps.json      — one row per MP (all 543), with the same
                                    cohort baseline/deviation/explanation
                                    logic applied whether or not it crossed
                                    the flag threshold (for MPs Overview)
  data/output/last_run_ids.json — case ids from the run before this one,
                                    used to compute each case's "is_new"
                                    flag and summary.json's
                                    "new_since_last_run" count

Stdlib only — no external dependencies.

Signal: allocation-cohort deviation. MPs sharing an identical tenure
window (the standard, full-term cohort for their House) should receive
an identical allocated amount, since MPLADS entitlement is a flat rate
per House. Members outside that window are compared against a
tenure-length pro-rata expectation instead. Deviations beyond a noise
threshold are flagged, plus a data-integrity check for duplicate
(state, constituency, house) records.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

RAW_DIR = Path(__file__).parent / "raw"
OUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = Path(__file__).parent / "output"
LAST_RUN_IDS_PATH = OUTPUT_DIR / "last_run_ids.json"

SOURCE_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html"
SOURCE_NAME = "MPLADS eSAKSHI Public Dashboard (MoSPI)"

NOISE_THRESHOLD_PCT = 5.0
HIGH_THRESHOLD_PCT = 50.0
MEDIUM_THRESHOLD_PCT = 15.0
SEVERITY_RANK = {"high": 2, "medium": 1, "low": 0}


def parse_date(s: str) -> datetime:
    return datetime.strptime(s, "%b %d, %Y %I:%M:%S %p")


def parse_indian_number(s: str) -> float:
    return float(s.strip().replace(",", ""))


def load_national_tiles() -> dict:
    """Real national aggregate tiles fetched live from the same MPLADS
    dashboard (data/raw/tiles.json) — works recommended/sanctioned/
    completed and total expenditure across all MPs, not per-MP."""
    path = RAW_DIR / "tiles.json"
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))["data"]

    def work_stat(key: str) -> dict:
        count_str, amount_str, display = raw[key]
        return {
            "count": int(parse_indian_number(count_str)),
            "amount_inr": parse_indian_number(amount_str),
            "display": display.strip(),
        }

    expenditure_amount, expenditure_display = raw["Expenditure on Completed and On-going Works as on Date"]
    calamity_count, calamity_amount, calamity_display = raw["Amount consented for Calamity"]

    return {
        "works_recommended": work_stat("Works Recommended"),
        "works_sanctioned": work_stat("Works Sanctioned"),
        "works_completed": work_stat("Works Completed"),
        "total_expenditure": {
            "amount_inr": parse_indian_number(expenditure_amount),
            "display": expenditure_display.strip(),
        },
        "amount_consented_calamity": {
            "count": int(parse_indian_number(calamity_count)),
            "amount_inr": parse_indian_number(calamity_amount),
            "display": calamity_display.strip(),
        },
        "tenure_label": raw["Current Tenure"][0]["CAPTION"],
    }


def severity_for(pct: float) -> str:
    if pct >= HIGH_THRESHOLD_PCT:
        return "high"
    if pct >= MEDIUM_THRESHOLD_PCT:
        return "medium"
    return "low"


def load_mps():
    payload = json.loads((RAW_DIR / "mp_allocations.json").read_text(encoding="utf-8"))
    rows = []
    for r in payload["data"]:
        # Skip the trailing grand-total pseudo-row (no Sno/MP_NAME).
        if "Sno" not in r or "MP_NAME" not in r:
            continue
        start = parse_date(r["TENURE_START_DATE"])
        end = parse_date(r["TENURE_END_DATE"])
        rows.append(
            {
                **r,
                "ALLOCATED_AMT": float(r["ALLOCATED_AMT"]),
                "tenure_start_dt": start,
                "tenure_end_dt": end,
                "tenure_days": (end - start).days,
            }
        )
    return rows


def build_cohort_lookup(rows: list[dict]) -> dict:
    """For each House, the standard (most common) tenure window and the
    baseline allocation paid to members in that window."""
    lookup = {}
    by_house = defaultdict(list)
    for r in rows:
        by_house[r["HOUSE_NAME"]].append(r)

    for house, group in by_house.items():
        window_counts = Counter(
            (r["TENURE_START_DATE"], r["TENURE_END_DATE"]) for r in group
        )
        standard_window = window_counts.most_common(1)[0][0]
        standard_group = [
            r
            for r in group
            if (r["TENURE_START_DATE"], r["TENURE_END_DATE"]) == standard_window
        ]
        baseline = Counter(r["ALLOCATED_AMT"] for r in standard_group).most_common(1)[0][0]
        lookup[house] = {
            "baseline": baseline,
            "standard_window": standard_window,
            "standard_days": standard_group[0]["tenure_days"],
        }
    return lookup


def analyze_row_cohort(row: dict, lookup: dict) -> dict:
    """Computes the cohort baseline/deviation for a single MP, and an
    explanation string, regardless of whether it crosses the flag
    threshold — used for both the always-flagged cases feed and the
    full MPs Overview roster."""
    house = row["HOUSE_NAME"]
    info = lookup[house]
    baseline = info["baseline"]
    standard_days = info["standard_days"]
    in_standard_cohort = (
        row["TENURE_START_DATE"],
        row["TENURE_END_DATE"],
    ) == info["standard_window"]

    if in_standard_cohort:
        expected = baseline
        basis = (
            f"the {house} baseline of ₹{baseline:,.0f} for members with an "
            f"identical tenure window ({row['tenure_start_dt'].strftime('%d %b %Y')}"
            f"–{row['tenure_end_dt'].strftime('%d %b %Y')})"
        )
    else:
        expected = baseline * (row["tenure_days"] / standard_days)
        basis = (
            f"a pro-rated expectation of ₹{expected:,.0f}, based on their "
            f"{row['tenure_days']}-day tenure versus the standard "
            f"{standard_days}-day {house} term (baseline ₹{baseline:,.0f})"
        )

    deviation_pct = ((row["ALLOCATED_AMT"] - expected) / expected) * 100
    flagged = abs(deviation_pct) >= NOISE_THRESHOLD_PCT

    if flagged:
        direction = "higher" if deviation_pct > 0 else "lower"
        explanation = (
            f"{row['MP_NAME']}'s recorded allocation of "
            f"₹{row['ALLOCATED_AMT']:,.0f} is {abs(deviation_pct):.1f}% "
            f"{direction} than {basis}. The tenure dates on record do not "
            f"account for this gap."
        )
        severity = severity_for(abs(deviation_pct))
        flag_type = (
            "allocation_cohort_deviation" if in_standard_cohort else "allocation_prorata_mismatch"
        )
        flag_label = "Allocation outlier" if in_standard_cohort else "Pro-rata mismatch"
    else:
        explanation = (
            f"{row['MP_NAME']}'s recorded allocation of "
            f"₹{row['ALLOCATED_AMT']:,.0f} is within "
            f"{abs(deviation_pct):.1f}% of {basis} — no anomaly flagged."
        )
        severity = None
        flag_type = None
        flag_label = None

    return {
        "expected": expected,
        "deviation_pct": deviation_pct,
        "flagged": flagged,
        "severity": severity,
        "flag_type": flag_type,
        "flag_label": flag_label,
        "explanation": explanation,
    }


def build_duplicate_lookup(rows: list[dict]) -> dict:
    """Sno -> duplicate-constituency flag, for MPs sharing a (state,
    constituency, house) with another record on file."""
    grouped = defaultdict(list)
    for r in rows:
        grouped[(r["STATE_NAME"], r["CONSTITUENCY"], r["HOUSE_NAME"])].append(r)

    dup_lookup = {}
    for (state, constituency, house), group in grouped.items():
        if len(group) <= 1:
            continue
        total_allocated = sum(r["ALLOCATED_AMT"] for r in group)
        avg_allocated = total_allocated / len(group)
        names = ", ".join(r["MP_NAME"] for r in group)
        explanation = (
            f"{constituency} ({state}, {house}) has {len(group)} separate MP "
            f"allocation records on file — {names} — totalling "
            f"₹{total_allocated:,.0f}. A constituency should have exactly "
            f"one sitting member per house; this points to an unresolved "
            f"mid-term replacement or a duplicate data entry."
        )
        for row in group:
            dup_lookup[row["Sno"]] = {
                "flag_type": "duplicate_constituency",
                "flag_label": "Duplicate constituency record",
                "severity": "high",
                "explanation": explanation,
                "cohort_baseline": avg_allocated,
            }
    return dup_lookup


def overall_severity(flags: list[dict]):
    if not flags:
        return None
    return max(flags, key=lambda f: SEVERITY_RANK[f["severity"]])["severity"]


def main() -> None:
    rows = load_mps()
    cohort_lookup = build_cohort_lookup(rows)
    dup_lookup = build_duplicate_lookup(rows)

    mps_out = []
    cases_out = []

    for row in rows:
        cohort = analyze_row_cohort(row, cohort_lookup)
        flags = []

        if cohort["flagged"]:
            flags.append(
                {
                    "flag_type": cohort["flag_type"],
                    "flag_label": cohort["flag_label"],
                    "severity": cohort["severity"],
                    "explanation": cohort["explanation"],
                }
            )
            cases_out.append(
                {
                    "id": f"MP-{row['Sno']}",
                    "mp_name": row["MP_NAME"],
                    "state": row["STATE_NAME"],
                    "constituency": row["CONSTITUENCY"],
                    "house": row["HOUSE_NAME"],
                    "allocated_amt": row["ALLOCATED_AMT"],
                    "cohort_baseline": cohort["expected"],
                    "deviation_pct": cohort["deviation_pct"],
                    "severity": cohort["severity"],
                    "flag_type": cohort["flag_type"],
                    "flag_label": cohort["flag_label"],
                    "explanation": cohort["explanation"],
                    "tenure_start": row["tenure_start_dt"].isoformat(),
                    "tenure_end": row["tenure_end_dt"].isoformat(),
                }
            )

        dup = dup_lookup.get(row["Sno"])
        if dup:
            flags.append(
                {
                    "flag_type": dup["flag_type"],
                    "flag_label": dup["flag_label"],
                    "severity": dup["severity"],
                    "explanation": dup["explanation"],
                }
            )
            cases_out.append(
                {
                    "id": f"DUP-{row['Sno']}",
                    "mp_name": row["MP_NAME"],
                    "state": row["STATE_NAME"],
                    "constituency": row["CONSTITUENCY"],
                    "house": row["HOUSE_NAME"],
                    "allocated_amt": row["ALLOCATED_AMT"],
                    "cohort_baseline": dup["cohort_baseline"],
                    "deviation_pct": 0.0,
                    "severity": dup["severity"],
                    "flag_type": dup["flag_type"],
                    "flag_label": dup["flag_label"],
                    "explanation": dup["explanation"],
                    "tenure_start": row["tenure_start_dt"].isoformat(),
                    "tenure_end": row["tenure_end_dt"].isoformat(),
                }
            )

        mps_out.append(
            {
                "id": f"MP-{row['Sno']}",
                "mp_name": row["MP_NAME"],
                "state": row["STATE_NAME"],
                "constituency": row["CONSTITUENCY"],
                "house": row["HOUSE_NAME"],
                "allocated_amt": row["ALLOCATED_AMT"],
                "cohort_baseline": cohort["expected"],
                "deviation_pct": cohort["deviation_pct"],
                "cohort_explanation": cohort["explanation"],
                "tenure_start": row["tenure_start_dt"].isoformat(),
                "tenure_end": row["tenure_end_dt"].isoformat(),
                "severity": overall_severity(flags),
                "flags": flags,
            }
        )

    cases_out.sort(key=lambda c: (-SEVERITY_RANK[c["severity"]], -abs(c["deviation_pct"])))
    mps_out.sort(key=lambda m: m["mp_name"])

    # Change detection: ids from the previous run's cases.json are what we
    # compare against to flag newly-appeared cases in this run.
    previous_cases_path = OUT_DIR / "cases.json"
    if previous_cases_path.exists():
        previous_ids = {c["id"] for c in json.loads(previous_cases_path.read_text(encoding="utf-8"))}
    else:
        previous_ids = set()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LAST_RUN_IDS_PATH.write_text(
        json.dumps(sorted(previous_ids), indent=2), encoding="utf-8"
    )

    new_since_last_run = 0
    for c in cases_out:
        c["is_new"] = c["id"] not in previous_ids
        if c["is_new"]:
            new_since_last_run += 1

    flagged_amount = sum(abs(c["allocated_amt"] - c["cohort_baseline"]) for c in cases_out)
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    for c in cases_out:
        severity_counts[c["severity"]] += 1

    total_allocated = sum(r["ALLOCATED_AMT"] for r in rows)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": SOURCE_NAME,
            "url": SOURCE_URL,
            "record_count": len(rows),
        },
        "thresholds": {
            "noise_pct": NOISE_THRESHOLD_PCT,
            "medium_pct": MEDIUM_THRESHOLD_PCT,
            "high_pct": HIGH_THRESHOLD_PCT,
        },
        "national_tiles": load_national_tiles(),
        "headline": {
            "flagged_amount_inr": flagged_amount,
            "flagged_amount_display": f"₹{flagged_amount / 1e7:.2f} Cr",
            "flagged_count": len(cases_out),
            "total_mps": len(rows),
            "total_allocated_inr": total_allocated,
            "total_allocated_display": f"₹{total_allocated / 1e7:.2f} Cr",
        },
        "severity_counts": severity_counts,
        "new_since_last_run": new_since_last_run,
    }

    (OUT_DIR / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "cases.json").write_text(
        json.dumps(cases_out, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "mps.json").write_text(
        json.dumps(mps_out, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"Scanned {len(rows)} MPs. Flagged {len(cases_out)} cases.")
    print(f"Headline: {flagged_amount / 1e7:.2f} Cr INR anomalous")
    print(f"Severity counts: {severity_counts}")
    print(f"New since last run: {new_since_last_run}")
    print(
        f"Wrote {OUT_DIR / 'summary.json'}, {OUT_DIR / 'cases.json'}, "
        f"and {OUT_DIR / 'mps.json'}"
    )


if __name__ == "__main__":
    main()
