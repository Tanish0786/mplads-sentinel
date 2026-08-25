import type { FlaggedCase, MPRecord, Summary } from "../types";
import { downloadCSV } from "../csv";

export function ReportsPage({
  summary,
  cases,
  mps,
  stateFilter,
}: {
  summary: Summary;
  cases: FlaggedCase[];
  mps: MPRecord[];
  stateFilter: string;
}) {
  const dateStamp = new Date(summary.generated_at).toISOString().slice(0, 10);
  const scopedCases = stateFilter === "all" ? cases : cases.filter((c) => c.state === stateFilter);
  const scopedMps = stateFilter === "all" ? mps : mps.filter((m) => m.state === stateFilter);
  const scopeSuffix = stateFilter === "all" ? "" : `-${stateFilter.toLowerCase().replace(/\s+/g, "-")}`;
  const scopeNote = stateFilter === "all" ? "" : ` in ${stateFilter}`;

  const reports = [
    {
      key: "flagged-cases",
      title: "Flagged cases (CSV)",
      description: `All ${scopedCases.length} flagged cases${scopeNote} with severity, deviation, and the full explanation text.`,
      onGenerate: () =>
        downloadCSV(
          `mplads-flagged-cases${scopeSuffix}-${dateStamp}.csv`,
          scopedCases.map((c) => ({
            id: c.id,
            mp_name: c.mp_name,
            state: c.state,
            constituency: c.constituency,
            house: c.house,
            allocated_amt: c.allocated_amt,
            cohort_baseline: c.cohort_baseline,
            deviation_pct: c.deviation_pct.toFixed(2),
            severity: c.severity,
            flag_type: c.flag_type,
            flag_label: c.flag_label,
            is_new: c.is_new,
            tenure_start: c.tenure_start,
            tenure_end: c.tenure_end,
            explanation: c.explanation,
          })),
        ),
    },
    {
      key: "mp-roster",
      title: "MP roster (CSV)",
      description: `All ${scopedMps.length} MPs on record${scopeNote}, with allocation, cohort baseline, deviation, and severity.`,
      onGenerate: () =>
        downloadCSV(
          `mplads-mp-roster${scopeSuffix}-${dateStamp}.csv`,
          scopedMps.map((m) => ({
            id: m.id,
            mp_name: m.mp_name,
            state: m.state,
            constituency: m.constituency,
            house: m.house,
            allocated_amt: m.allocated_amt,
            cohort_baseline: m.cohort_baseline,
            deviation_pct: m.deviation_pct.toFixed(2),
            severity: m.severity ?? "none",
            tenure_start: m.tenure_start,
            tenure_end: m.tenure_end,
          })),
        ),
    },
    {
      key: "new-since-last-scan",
      title: "New anomalies since last scan (CSV)",
      description: `The ${scopedCases.filter((c) => c.is_new).length} case(s)${scopeNote} that first appeared in the most recent detection run.`,
      onGenerate: () =>
        downloadCSV(
          `mplads-new-anomalies${scopeSuffix}-${dateStamp}.csv`,
          scopedCases
            .filter((c) => c.is_new)
            .map((c) => ({
              id: c.id,
              mp_name: c.mp_name,
              state: c.state,
              constituency: c.constituency,
              severity: c.severity,
              flag_label: c.flag_label,
              deviation_pct: c.deviation_pct.toFixed(2),
              explanation: c.explanation,
            })),
        ),
      disabled: scopedCases.filter((c) => c.is_new).length === 0,
    },
  ];

  return (
    <>
      <p className="text-sm text-[var(--color-muted)]">
        Every export below is generated on the spot from the same real data
        driving the Dashboard — there's no separate report-generation
        pipeline, so the numbers can never drift from what you see elsewhere
        in the app.
      </p>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div
            key={r.key}
            className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]">
                <DocIcon />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-ink)]">{r.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                {r.description}
              </p>
            </div>
            <button
              onClick={r.onGenerate}
              disabled={r.disabled}
              className="mt-4 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download CSV
            </button>
          </div>
        ))}
      </section>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        Looking for financial summaries, project-level reports, or scheduled
        report delivery? Those would need per-work expenditure data the
        public MPLADS dashboard doesn't expose — see the README for the
        current data scope.
      </p>
    </>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}
