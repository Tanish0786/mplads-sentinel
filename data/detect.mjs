// Runs real anomaly-detection logic on the MP-level MPLADS allocation
// data pulled by fetch.mjs, and writes the dashboard's data contract:
// web/public/data/summary.json and web/public/data/cases.json.
//
// Every number here is computed from data/raw/mp_allocations.json —
// nothing is hardcoded. See PROJECT_BRIEF.md for why the detection
// signals operate at MP/allocation granularity rather than
// individual-work granularity: the official public MPLADS dashboard
// does not expose per-work records, and no free per-work dataset for
// the current term could be sourced ethically.
//
// Two real, explainable signals are computed:
//
// 1. Allocation-cohort deviation. MPs who share an identical tenure
//    window (same TENURE_START_DATE/TENURE_END_DATE — i.e. the
//    standard, full-term cohort for their House) should receive an
//    identical allocated amount, since MPLADS entitlement is a flat
//    rate per House. Members outside the standard cohort
//    (bye-elections, RS rotations, etc.) are compared against a
//    tenure-length-adjusted pro-rata expectation instead. Any member
//    whose recorded ALLOCATED_AMT deviates from what their tenure
//    dates justify, beyond a noise threshold, is flagged.
//
// 2. Duplicate constituency records. Exactly one sitting member should
//    be recorded per (state, constituency, house). Multiple rows
//    sharing that triple point to unresolved mid-term replacements or
//    duplicate data entry, both of which mask true fund allocation.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "raw");
const OUT_DIR = join(__dirname, "..", "web", "public", "data");
mkdirSync(OUT_DIR, { recursive: true });

const SOURCE_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html";
const SOURCE_NAME = "MPLADS eSAKSHI Public Dashboard (MoSPI)";

const NOISE_THRESHOLD_PCT = 5.0;
const HIGH_THRESHOLD_PCT = 50.0;
const MEDIUM_THRESHOLD_PCT = 15.0;

function severityFor(pct) {
  if (pct >= HIGH_THRESHOLD_PCT) return "high";
  if (pct >= MEDIUM_THRESHOLD_PCT) return "medium";
  return "low";
}

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = -1;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function loadMps() {
  const payload = JSON.parse(
    readFileSync(join(RAW_DIR, "mp_allocations.json"), "utf-8")
  );
  // The API response includes a trailing grand-total pseudo-row (no
  // MP_NAME/Sno, just a Total_Amt) that mirrors the "Grand Total" row
  // shown at the top of the table on the live site. Exclude it — it is
  // not an MP record.
  const rows = payload.data
    .filter((r) => r.Sno !== undefined && r.MP_NAME)
    .map((r) => {
    const tenureStart = new Date(r.TENURE_START_DATE);
    const tenureEnd = new Date(r.TENURE_END_DATE);
    return {
      ...r,
      ALLOCATED_AMT: Number(r.ALLOCATED_AMT),
      tenureStart,
      tenureEnd,
      tenureDays: Math.round((tenureEnd - tenureStart) / 86400000),
    };
  });
  return { rows, fetchedAt: payload.fetched_at };
}

function detectAllocationCohortAnomalies(rows) {
  const cases = [];
  const byHouse = groupBy(rows, (r) => r.HOUSE_NAME);

  for (const [house, group] of byHouse) {
    const byWindow = groupBy(
      group,
      (r) => `${r.TENURE_START_DATE}__${r.TENURE_END_DATE}`
    );
    let standardKey = null;
    let standardCount = -1;
    for (const [key, g] of byWindow) {
      if (g.length > standardCount) {
        standardKey = key;
        standardCount = g.length;
      }
    }
    const standardGroup = byWindow.get(standardKey);
    const baseline = mode(standardGroup.map((r) => r.ALLOCATED_AMT));
    const standardDays = standardGroup[0].tenureDays;
    const [stdStart, stdEnd] = standardKey.split("__");

    for (const row of group) {
      const inStandardCohort =
        row.TENURE_START_DATE === stdStart && row.TENURE_END_DATE === stdEnd;

      let expected, basis;
      if (inStandardCohort) {
        expected = baseline;
        basis =
          `the ${house} baseline of ₹${baseline.toLocaleString("en-IN")} for members ` +
          `with an identical tenure window (${row.tenureStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}–` +
          `${row.tenureEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})`;
      } else {
        expected = baseline * (row.tenureDays / standardDays);
        basis =
          `a pro-rated expectation of ₹${Math.round(expected).toLocaleString("en-IN")}, based on ` +
          `their ${row.tenureDays}-day tenure versus the standard ` +
          `${standardDays}-day ${house} term (baseline ₹${baseline.toLocaleString("en-IN")})`;
      }

      const deviationPct = ((row.ALLOCATED_AMT - expected) / expected) * 100;
      if (Math.abs(deviationPct) < NOISE_THRESHOLD_PCT) continue;

      const direction = deviationPct > 0 ? "higher" : "lower";
      const explanation =
        `${row.MP_NAME}'s recorded allocation of ₹${row.ALLOCATED_AMT.toLocaleString("en-IN")} ` +
        `is ${Math.abs(deviationPct).toFixed(1)}% ${direction} than ${basis}. ` +
        `The tenure dates on record do not account for this gap.`;

      cases.push({
        id: `MP-${row.Sno}`,
        mp_name: row.MP_NAME,
        state: row.STATE_NAME,
        constituency: row.CONSTITUENCY,
        house,
        allocated_amt: row.ALLOCATED_AMT,
        cohort_baseline: expected,
        deviation_pct: deviationPct,
        severity: severityFor(Math.abs(deviationPct)),
        flag_type: inStandardCohort
          ? "allocation_cohort_deviation"
          : "allocation_prorata_mismatch",
        flag_label: inStandardCohort ? "Allocation outlier" : "Pro-rata mismatch",
        explanation,
        tenure_start: row.tenureStart.toISOString(),
        tenure_end: row.tenureEnd.toISOString(),
      });
    }
  }
  return cases;
}

function detectDuplicateConstituencies(rows) {
  const cases = [];
  const grouped = groupBy(
    rows,
    (r) => `${r.STATE_NAME}__${r.CONSTITUENCY}__${r.HOUSE_NAME}`
  );
  for (const [key, group] of grouped) {
    if (group.length <= 1) continue;
    const [state, constituency, house] = key.split("__");
    const totalAllocated = group.reduce((s, r) => s + r.ALLOCATED_AMT, 0);
    const names = group.map((r) => r.MP_NAME).join(", ");
    const explanation =
      `${constituency} (${state}, ${house}) has ${group.length} separate MP ` +
      `allocation records on file — ${names} — totalling ` +
      `₹${totalAllocated.toLocaleString("en-IN")}. A constituency should have exactly ` +
      `one sitting member per house; this points to an unresolved ` +
      `mid-term replacement or a duplicate data entry.`;

    for (const row of group) {
      cases.push({
        id: `DUP-${row.Sno}`,
        mp_name: row.MP_NAME,
        state,
        constituency,
        house,
        allocated_amt: row.ALLOCATED_AMT,
        cohort_baseline: totalAllocated / group.length,
        deviation_pct: 0.0,
        severity: "high",
        flag_type: "duplicate_constituency",
        flag_label: "Duplicate constituency record",
        explanation,
        tenure_start: row.tenureStart.toISOString(),
        tenure_end: row.tenureEnd.toISOString(),
      });
    }
  }
  return cases;
}

function main() {
  const { rows } = loadMps();

  const cases = [
    ...detectAllocationCohortAnomalies(rows),
    ...detectDuplicateConstituencies(rows),
  ];

  const severityRank = { high: 2, medium: 1, low: 0 };
  cases.sort((a, b) => {
    const rankDiff = severityRank[b.severity] - severityRank[a.severity];
    if (rankDiff !== 0) return rankDiff;
    return Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct);
  });

  const flaggedAmount = cases.reduce(
    (sum, c) => sum + Math.abs(c.allocated_amt - c.cohort_baseline),
    0
  );
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const c of cases) severityCounts[c.severity]++;

  const totalAllocated = rows.reduce((s, r) => s + r.ALLOCATED_AMT, 0);

  const summary = {
    generated_at: new Date().toISOString(),
    source: {
      name: SOURCE_NAME,
      url: SOURCE_URL,
      record_count: rows.length,
    },
    headline: {
      flagged_amount_inr: flaggedAmount,
      flagged_amount_display: `₹${(flaggedAmount / 1e7).toFixed(2)} Cr`,
      flagged_count: cases.length,
      total_mps: rows.length,
      total_allocated_inr: totalAllocated,
      total_allocated_display: `₹${(totalAllocated / 1e7).toFixed(2)} Cr`,
    },
    severity_counts: severityCounts,
  };

  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(OUT_DIR, "cases.json"), JSON.stringify(cases, null, 2));

  console.log(`Scanned ${rows.length} MPs. Flagged ${cases.length} cases.`);
  console.log(`Headline: ${summary.headline.flagged_amount_display} anomalous`);
  console.log(`Severity counts:`, severityCounts);
  console.log(`Wrote ${join(OUT_DIR, "summary.json")} and cases.json`);
}

main();
