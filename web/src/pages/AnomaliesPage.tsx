import { useMemo, useState } from "react";
import type { FlaggedCase, Severity, Summary } from "../types";
import { SeverityBadge } from "../components/SeverityBadge";
import { KpiCard } from "../components/KpiCard";
import { formatCrore, formatPct } from "../format";
import { CaseDetail, NewBadge } from "./Dashboard";

type SeverityFilter = "all" | Severity;
type TypeFilter = "all" | string;

const FLAG_TYPE_LABELS: Record<string, string> = {
  allocation_cohort_deviation: "Allocation outlier",
  allocation_prorata_mismatch: "Pro-rata mismatch",
  duplicate_constituency: "Duplicate constituency",
};

export function AnomaliesPage({
  summary,
  cases,
  stateFilter,
}: {
  summary: Summary;
  cases: FlaggedCase[];
  stateFilter: string;
}) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FlaggedCase | null>(null);

  const scoped = useMemo(
    () => (stateFilter === "all" ? cases : cases.filter((c) => c.state === stateFilter)),
    [cases, stateFilter],
  );

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const c of scoped) counts[c.severity]++;
    return counts;
  }, [scoped]);

  const flagTypes = useMemo(
    () => Array.from(new Set(scoped.map((c) => c.flag_type))),
    [scoped],
  );

  const filtered = useMemo(() => {
    return scoped.filter((c) => {
      if (severityFilter !== "all" && c.severity !== severityFilter) return false;
      if (typeFilter !== "all" && c.flag_type !== typeFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.mp_name.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.constituency.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scoped, severityFilter, typeFilter, query]);

  return (
    <>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<FlagIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Total anomalies"
          value={scoped.length.toLocaleString("en-IN")}
        />
        <KpiCard
          icon={<DotIcon />}
          iconBg="#a4231d1a"
          iconColor="#a4231d"
          label="High risk"
          value={severityCounts.high.toLocaleString("en-IN")}
          active={severityFilter === "high"}
          onClick={() => setSeverityFilter(severityFilter === "high" ? "all" : "high")}
        />
        <KpiCard
          icon={<DotIcon />}
          iconBg="#fde68a55"
          iconColor="#b3660a"
          label="Medium risk"
          value={severityCounts.medium.toLocaleString("en-IN")}
          active={severityFilter === "medium"}
          onClick={() => setSeverityFilter(severityFilter === "medium" ? "all" : "medium")}
        />
        <KpiCard
          icon={<DotIcon />}
          iconBg="#4a7a3a1a"
          iconColor="#4a7a3a"
          label="Low risk"
          value={severityCounts.low.toLocaleString("en-IN")}
          active={severityFilter === "low"}
          onClick={() => setSeverityFilter(severityFilter === "low" ? "all" : "low")}
        />
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Anomaly list {severityFilter !== "all" && `· ${severityFilter}`}
          </h2>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="all">All types</option>
              {flagTypes.map((t) => (
                <option key={t} value={t}>
                  {FLAG_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search MP, state, or constituency…"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)] sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">MP</th>
                <th className="px-4 py-2 font-medium">State / Constituency</th>
                <th className="px-4 py-2 text-right font-medium">Allocated</th>
                <th className="px-4 py-2 text-right font-medium">Deviation</th>
                <th className="px-4 py-2 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-paper)]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={c.severity} />
                      {c.is_new && <NewBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">
                    {c.mp_name}
                    <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                      {c.house}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-muted)]">
                    {c.state} · {c.constituency}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCrore(c.allocated_amt)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatPct(c.deviation_pct)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-muted)]">{c.flag_label}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                    No anomalies match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-muted)]">
          Showing {filtered.length} of {scoped.length} anomalies
          {stateFilter !== "all" ? ` in ${stateFilter}` : ""}. Generated{" "}
          {new Date(summary.generated_at).toLocaleString("en-IN")}.
        </div>
      </section>

      {selected && <CaseDetail case={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3v18M5 4h12l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
