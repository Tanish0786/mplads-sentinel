import { useMemo } from "react";
import type { FlaggedCase, MPRecord } from "../types";
import { IndiaMap } from "../components/IndiaMap";
import { KpiCard } from "../components/KpiCard";

export function AnalyticsPage({
  cases,
  mps,
  stateFilter,
}: {
  cases: FlaggedCase[];
  mps: MPRecord[];
  stateFilter: string;
}) {
  const scopedCases = useMemo(
    () => (stateFilter === "all" ? cases : cases.filter((c) => c.state === stateFilter)),
    [cases, stateFilter],
  );
  const scopedMps = useMemo(
    () => (stateFilter === "all" ? mps : mps.filter((m) => m.state === stateFilter)),
    [mps, stateFilter],
  );

  const stats = useMemo(() => {
    const flaggedAmount = scopedCases.reduce(
      (sum, c) => sum + Math.abs(c.allocated_amt - c.cohort_baseline),
      0,
    );
    const avgDeviation =
      scopedCases.length === 0
        ? 0
        : scopedCases.reduce((sum, c) => sum + Math.abs(c.deviation_pct), 0) / scopedCases.length;
    const worst = scopedCases.reduce(
      (max, c) => (Math.abs(c.deviation_pct) > Math.abs(max?.deviation_pct ?? 0) ? c : max),
      null as FlaggedCase | null,
    );
    return { flaggedAmount, avgDeviation, worst };
  }, [scopedCases]);

  const byState = useMemo(() => {
    const rows = new Map<string, { count: number; amount: number; mps: number }>();
    for (const m of scopedMps) {
      const row = rows.get(m.state) ?? { count: 0, amount: 0, mps: 0 };
      row.mps++;
      rows.set(m.state, row);
    }
    for (const c of scopedCases) {
      const row = rows.get(c.state) ?? { count: 0, amount: 0, mps: 0 };
      row.count++;
      row.amount += Math.abs(c.allocated_amt - c.cohort_baseline);
      rows.set(c.state, row);
    }
    return Array.from(rows.entries())
      .map(([state, r]) => ({ state, ...r }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedMps, scopedCases]);

  return (
    <>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<RupeeIcon />}
          iconBg="#a4231d1a"
          iconColor="#a4231d"
          label="Amount flagged"
          value={`₹${(stats.flaggedAmount / 1e7).toFixed(2)} Cr`}
        />
        <KpiCard
          icon={<PercentIcon />}
          iconBg="#fde68a55"
          iconColor="#b3660a"
          label="Avg. deviation (flagged)"
          value={`${stats.avgDeviation.toFixed(1)}%`}
        />
        <KpiCard
          icon={<CasesIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Cases in scope"
          value={scopedCases.length.toLocaleString("en-IN")}
        />
        <KpiCard
          icon={<AlertIcon />}
          iconBg="#7c3aed1a"
          iconColor="#7c3aed"
          label="Largest single deviation"
          value={stats.worst ? `${Math.abs(stats.worst.deviation_pct).toFixed(1)}%` : "—"}
          caption={stats.worst ? `${stats.worst.mp_name}, ${stats.worst.state}` : undefined}
        />
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Anomaly map by state
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          Real state boundaries, shaded by real amount flagged per state.
        </p>
        <div className="mx-auto mt-4 w-full sm:max-w-sm md:max-w-md lg:max-w-lg">
          <IndiaMap
            values={Object.fromEntries(byState.map((r) => [r.state, r.amount]))}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="border-b border-[var(--color-border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">By state</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 text-right font-medium">MPs</th>
                <th className="px-4 py-2 text-right font-medium">Flagged cases</th>
                <th className="px-4 py-2 text-right font-medium">Amount flagged</th>
              </tr>
            </thead>
            <tbody>
              {byState.map((r) => (
                <tr key={r.state} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--color-ink)]">{r.state}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted)]">{r.mps}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted)]">{r.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    ₹{(r.amount / 1e7).toFixed(2)} Cr
                  </td>
                </tr>
              ))}
              {byState.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                    No data in scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        All figures on this page are computed live from the same cases.json /
        mps.json produced by the detection pipeline — nothing here is a
        separate estimate.
      </p>
    </>
  );
}

function RupeeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 5h10M7 9h10M7 5c4 0 6 1.5 6 4s-2 4-6 4h-1l7 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PercentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
function CasesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.6 2.9-1.6 4h13.2c-1-1.1-1.6-2.5-1.6-4V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
