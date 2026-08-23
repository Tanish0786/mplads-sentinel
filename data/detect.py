"""Runs real anomaly-detection logic on the MP-level MPLADS allocation
data in data/raw/mp_allocations.json (pulled live from the official
MPLADS dashboard), and writes web/public/data/summary.json and
web/public/data/cases.json. Stdlib only — no external dependencies.

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

SOURCE_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html"
SOURCE_NAME = "MPLADS eSAKSHI Public Dashboard (MoSPI)"

NOISE_THRESHOLD_PCT = 5.0
HIGH_THRESHOLD_PCT = 50.0
MEDIUM_THRESHOLD_PCT = 15.0


def parse_date(s: str) -> datetime:
    return datetime.strptime(s, "%b %d, %Y %I:%M:%S %p")


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
    return rows, payload["fetched_at"]


def detect_allocation_cohort_anomalies(rows: list[dict]) -> list[dict]:
    cases = []
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
        standard_days = standard_group[0]["tenure_days"]

        for row in group:
            in_standard_cohort = (
                row["TENURE_START_DATE"],
                row["TENURE_END_DATE"],
            ) == standard_window

            if in_standard_cohort:
                expected = baseline
                basis = (
                    f"the {house} baseline of ₹{baseline:,.0f} for members "
                    f"with an identical tenure window "
                    f"({row['tenure_start_dt'].strftime('%d %b %Y')}–"
                    f"{row['tenure_end_dt'].strftime('%d %b %Y')})"
                )
            else:
                expected = baseline * (row["tenure_days"] / standard_days)
                basis = (
                    f"a pro-rated expectation of ₹{expected:,.0f}, based on "
                    f"their {row['tenure_days']}-day tenure versus the standard "
                    f"{standard_days}-day {house} term (baseline "
                    f"₹{baseline:,.0f})"
                )

            deviation_pct = ((row["ALLOCATED_AMT"] - expected) / expected) * 100
            if abs(deviation_pct) < NOISE_THRESHOLD_PCT:
                continue

            direction = "higher" if deviation_pct > 0 else "lower"
            explanation = (
                f"{row['MP_NAME']}'s recorded allocation of "
                f"₹{row['ALLOCATED_AMT']:,.0f} is {abs(deviation_pct):.1f}% "
                f"{direction} than {basis}. The tenure dates on record do not "
                f"account for this gap."
            )

            cases.append(
                {
                    "id": f"MP-{row['Sno']}",
                    "mp_name": row["MP_NAME"],
                    "state": row["STATE_NAME"],
                    "constituency": row["CONSTITUENCY"],
                    "house": house,
                    "allocated_amt": row["ALLOCATED_AMT"],
                    "cohort_baseline": expected,
                    "deviation_pct": deviation_pct,
                    "severity": severity_for(abs(deviation_pct)),
                    "flag_type": "allocation_cohort_deviation"
                    if in_standard_cohort
                    else "allocation_prorata_mismatch",
                    "flag_label": "Allocation outlier"
                    if in_standard_cohort
                    else "Pro-rata mismatch",
                    "explanation": explanation,
                    "tenure_start": row["tenure_start_dt"].isoformat(),
                    "tenure_end": row["tenure_end_dt"].isoformat(),
                }
            )
    return cases


def detect_duplicate_constituencies(rows: list[dict]) -> list[dict]:
    cases = []
    grouped = defaultdict(list)
    for r in rows:
        grouped[(r["STATE_NAME"], r["CONSTITUENCY"], r["HOUSE_NAME"])].append(r)

    for (state, constituency, house), group in grouped.items():
        if len(group) <= 1:
            continue
        total_allocated = sum(r["ALLOCATED_AMT"] for r in group)
        names = ", ".join(r["MP_NAME"] for r in group)
        explanation = (
            f"{constituency} ({state}, {house}) has {len(group)} separate MP "
            f"allocation records on file — {names} — totalling "
            f"₹{total_allocated:,.0f}. A constituency should have exactly "
            f"one sitting member per house; this points to an unresolved "
            f"mid-term replacement or a duplicate data entry."
        )
        for row in group:
            cases.append(
                {
                    "id": f"DUP-{row['Sno']}",
                    "mp_name": row["MP_NAME"],
                    "state": state,
                    "constituency": constituency,
                    "house": house,
                    "allocated_amt": row["ALLOCATED_AMT"],
                    "cohort_baseline": total_allocated / len(group),
                    "deviation_pct": 0.0,
                    "severity": "high",
                    "flag_type": "duplicate_constituency",
                    "flag_label": "Duplicate constituency record",
                    "explanation": explanation,
                    "tenure_start": row["tenure_start_dt"].isoformat(),
                    "tenure_end": row["tenure_end_dt"].isoformat(),
                }
            )
    return cases


def main() -> None:
    rows, _fetched_at = load_mps()

    cases = detect_allocation_cohort_anomalies(rows) + detect_duplicate_constituencies(rows)
    severity_rank = {"high": 2, "medium": 1, "low": 0}
    cases.sort(key=lambda c: (-severity_rank[c["severity"]], -abs(c["deviation_pct"])))

    flagged_amount = sum(abs(c["allocated_amt"] - c["cohort_baseline"]) for c in cases)
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    for c in cases:
        severity_counts[c["severity"]] += 1

    total_allocated = sum(r["ALLOCATED_AMT"] for r in rows)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": SOURCE_NAME,
            "url": SOURCE_URL,
            "record_count": len(rows),
        },
        "headline": {
            "flagged_amount_inr": flagged_amount,
            "flagged_amount_display": f"₹{flagged_amount / 1e7:.2f} Cr",
            "flagged_count": len(cases),
            "total_mps": len(rows),
            "total_allocated_inr": total_allocated,
            "total_allocated_display": f"₹{total_allocated / 1e7:.2f} Cr",
        },
        "severity_counts": severity_counts,
    }

    (OUT_DIR / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "cases.json").write_text(
        json.dumps(cases, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"Scanned {len(rows)} MPs. Flagged {len(cases)} cases.")
    print(f"Headline: {flagged_amount / 1e7:.2f} Cr INR anomalous")
    print(f"Severity counts: {severity_counts}")
    print(f"Wrote {OUT_DIR / 'summary.json'} and {OUT_DIR / 'cases.json'}")


if __name__ == "__main__":
    main()
