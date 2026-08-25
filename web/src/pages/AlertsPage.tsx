import { useState } from "react";
import type { FlaggedCase } from "../types";
import { SeverityBadge } from "../components/SeverityBadge";
import { formatCrore, formatPct } from "../format";
import { CaseDetail } from "./Dashboard";

export function AlertsPage({
  cases,
  stateFilter,
}: {
  cases: FlaggedCase[];
  stateFilter: string;
}) {
  const [selected, setSelected] = useState<FlaggedCase | null>(null);
  const scoped = stateFilter === "all" ? cases : cases.filter((c) => c.state === stateFilter);
  const newCases = scoped.filter((c) => c.is_new);

  if (newCases.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 12.5 11 14.5 15.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-semibold text-[var(--color-ink)]">
            {stateFilter === "all"
              ? "No new anomalies since the last scan"
              : `No new anomalies in ${stateFilter} since the last scan`}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Alerts appear here automatically whenever a fresh detection run
            finds a case that wasn't flagged last time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-[var(--color-muted)]">
        {newCases.length} case{newCases.length === 1 ? "" : "s"} flagged for
        the first time in the most recent scan.
      </p>

      <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="divide-y divide-[var(--color-border)]">
          {newCases.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--color-paper)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-severity-high)]/10 text-[var(--color-severity-high)]">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.6 2.9-1.6 4h13.2c-1-1.1-1.6-2.5-1.6-4V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
                    <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {c.flag_label} — {c.mp_name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {c.constituency}, {c.state} · {formatCrore(c.allocated_amt)} ·{" "}
                    {formatPct(c.deviation_pct)}
                  </p>
                </div>
              </div>
              <SeverityBadge severity={c.severity} />
            </button>
          ))}
        </div>
      </section>

      {selected && <CaseDetail case={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
