import { useMemo, useState } from "react";
import type { FlaggedCase, Severity, Summary } from "../types";
import { SeverityBadge } from "../components/SeverityBadge";
import { Donut } from "../components/Donut";
import { StackedBar } from "../components/StackedBar";
import { KpiCard } from "../components/KpiCard";
import { formatINR, formatPct } from "../format";

const FLAG_TYPE_LABELS: Record<string, string> = {
  allocation_cohort_deviation: "Allocation outlier",
  allocation_prorata_mismatch: "Pro-rata mismatch",
  duplicate_constituency: "Duplicate constituency",
};

const SEVERITY_COLORS: Record<Severity, string> = {
  high: "#a4231d",
  medium: "#b3660a",
  low: "#4a7a3a",
};

const TYPE_COLORS = ["#a4231d", "#b3660a", "#7c3aed"];

export function Dashboard({
  summary,
  cases,
  stateFilter,
}: {
  summary: Summary;
  cases: FlaggedCase[];
  stateFilter: string;
}) {
  const [selected, setSelected] = useState<FlaggedCase | null>(null);

  const scoped = useMemo(
    () => (stateFilter === "all" ? cases : cases.filter((c) => c.state === stateFilter)),
    [cases, stateFilter],
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of scoped) counts.set(c.flag_type, (counts.get(c.flag_type) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([flag_type, count], i) => ({
        label: FLAG_TYPE_LABELS[flag_type] ?? flag_type,
        value: count,
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [scoped]);

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const c of scoped) counts[c.severity]++;
    return counts;
  }, [scoped]);

  const topStates = useMemo(() => {
    const byState = new Map<string, number>();
    for (const c of scoped) {
      byState.set(c.state, (byState.get(c.state) ?? 0) + Math.abs(c.allocated_amt - c.cohort_baseline));
    }
    const rows = Array.from(byState.entries())
      .map(([state, amount]) => ({ state, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const max = Math.max(1, ...rows.map((r) => r.amount));
    return rows.map((r) => ({ ...r, pct: (r.amount / max) * 100 }));
  }, [scoped]);

  const recentNew = useMemo(() => scoped.filter((c) => c.is_new).slice(0, 5), [scoped]);

  const scopedFlaggedAmount = useMemo(
    () => scoped.reduce((sum, c) => sum + Math.abs(c.allocated_amt - c.cohort_baseline), 0),
    [scoped],
  );

  const tiles = summary.national_tiles;
  const pipeline = [
    { label: "Recommended", ...tiles.works_recommended, color: "var(--color-brand)" },
    { label: "Sanctioned", ...tiles.works_sanctioned, color: "#b3660a" },
    { label: "Completed", ...tiles.works_completed, color: "#4a7a3a" },
  ];
  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <>
      {summary.new_since_last_run > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--color-severity-medium)]/40 bg-[var(--color-severity-medium)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
          <AlertIcon />
          <span>
            <strong className="font-semibold">{summary.new_since_last_run}</strong>{" "}
            new anomal{summary.new_since_last_run === 1 ? "y" : "ies"} detected
            since last scan.
          </span>
        </div>
      )}

      {/* KPI stat-card row — mirrors the national tiles on the real MPLADS dashboard */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<DocIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Works sanctioned"
          value={tiles.works_sanctioned.count.toLocaleString("en-IN")}
          caption={`₹${(tiles.works_sanctioned.amount_inr / 1e7).toFixed(2)} Cr`}
        />
        <KpiCard
          icon={<RupeeIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Total allocated"
          value={summary.headline.total_allocated_display}
        />
        <KpiCard
          icon={<BankIcon />}
          iconBg="#7c3aed1a"
          iconColor="#7c3aed"
          label="Total expenditure"
          value={`₹${tiles.total_expenditure.display}`}
        />
        <KpiCard
          icon={<FlagIcon />}
          iconBg="#fde68a55"
          iconColor="#b3660a"
          label="Flagged cases"
          value={summary.headline.flagged_count.toLocaleString("en-IN")}
        />
        <KpiCard
          icon={<AlertIcon />}
          iconBg="#a4231d1a"
          iconColor="#a4231d"
          label="Amount at risk"
          value={summary.headline.flagged_amount_display}
        />
      </section>

      <p className="mt-3 text-sm text-[var(--color-muted)]">
        <strong className="font-semibold text-[var(--color-ink)]">
          {summary.headline.flagged_amount_display}
        </strong>{" "}
        in anomalous allocations flagged across{" "}
        {summary.headline.flagged_count} of {summary.headline.total_mps} MPs
        scanned, against {summary.headline.total_allocated_display} in total
        MPLADS funds allocated to the {tiles.tenure_label}.
        {stateFilter !== "all" && (
          <>
            {" "}Showing {scoped.length} cases in <strong>{stateFilter}</strong>{" "}
            (₹{(scopedFlaggedAmount / 1e7).toFixed(2)} Cr).
          </>
        )}
      </p>

      {/* Charts + works pipeline */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Anomalies by type</h2>
          <div className="mt-4">
            <StackedBar segments={typeCounts} />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Works pipeline (national)</h2>
          <div className="mt-4 space-y-3">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[var(--color-ink)]">{p.label}</span>
                  <span className="tabular-nums font-medium text-[var(--color-muted)]">
                    {p.count.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-[var(--color-paper)]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(p.count / pipelineMax) * 100}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[var(--color-muted)]">
            Live national totals across all MPs, not per-work detail.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Cases by risk level</h2>
          <div className="mt-4">
            <Donut
              segments={[
                { label: "High", value: severityCounts.high, color: SEVERITY_COLORS.high },
                { label: "Medium", value: severityCounts.medium, color: SEVERITY_COLORS.medium },
                { label: "Low", value: severityCounts.low, color: SEVERITY_COLORS.low },
              ]}
              centerValue={String(scoped.length)}
              centerLabel="Total"
              size={120}
            />
          </div>
        </div>
      </section>

      {/* Top states + recent anomalies */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Top states by amount flagged</h2>
          <div className="mt-4 space-y-3">
            {topStates.length === 0 && (
              <p className="text-xs text-[var(--color-muted)]">No flagged cases in scope.</p>
            )}
            {topStates.map((s) => (
              <div key={s.state}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[var(--color-ink)]">{s.state}</span>
                  <span className="tabular-nums font-medium text-[var(--color-muted)]">
                    ₹{(s.amount / 1e7).toFixed(2)} Cr
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-paper)]">
                  <div className="h-1.5 rounded-full bg-[var(--color-severity-high)]" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent anomalies</h2>
          {recentNew.length === 0 ? (
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              Nothing new since the last scan.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-[var(--color-border)]">
              {recentNew.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-[var(--color-paper)]"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--color-ink)]">{c.mp_name}</p>
                    <p className="text-[10px] text-[var(--color-muted)]">
                      {c.constituency}, {c.state}
                    </p>
                  </div>
                  <SeverityBadge severity={c.severity} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        Methodology: allocation figures are pulled live from the official
        pre-login MPLADS dashboard API. Each MP's allocated amount is
        compared against the statistical baseline for their House and
        tenure cohort; deviations beyond the threshold are flagged as
        anomalies, alongside data-integrity checks such as duplicate
        constituency assignments. No figure on this page is hardcoded.
      </p>

      {selected && <CaseDetail case={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}
function RupeeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 5h10M7 9h10M7 5c4 0 6 1.5 6 4s-2 4-6 4h-1l7 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10 12 4l9 6M4 10v10M20 10v10M4 20h16M9 13v5M15 13v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3v18M5 4h12l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--color-severity-medium)]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.6 2.9-1.6 4h13.2c-1-1.1-1.6-2.5-1.6-4V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function CaseDetail({ case: c, onClose }: { case: FlaggedCase; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-panel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <SeverityBadge severity={c.severity} />
              {c.is_new && <NewBadge />}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {c.mp_name}
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              {c.house} · {c.constituency}, {c.state}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Why this was flagged
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
            {c.explanation}
          </p>
        </div>

        <ExpectedVsActual expected={c.cohort_baseline} actual={c.allocated_amt} />

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Allocated amount</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatINR(c.allocated_amt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Cohort baseline</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatINR(c.cohort_baseline)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Deviation</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatPct(c.deviation_pct)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Flag type</dt>
            <dd className="mt-0.5 font-medium">{c.flag_label}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure start</dt>
            <dd className="mt-0.5">{new Date(c.tenure_start).toLocaleDateString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure end</dt>
            <dd className="mt-0.5">{new Date(c.tenure_end).toLocaleDateString("en-IN")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      New
    </span>
  );
}

function ExpectedVsActual({ expected, actual }: { expected: number; actual: number }) {
  const max = Math.max(expected, actual, 1);
  const higher = actual > expected;
  return (
    <div className="mt-4 rounded-lg border border-[var(--color-border)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Expected vs. actual
      </p>
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[var(--color-muted)]">Expected</span>
            <span className="tabular-nums font-medium text-[var(--color-ink)]">
              {formatINR(expected)}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-[var(--color-paper)]">
            <div
              className="h-2 rounded-full bg-[var(--color-muted)]"
              style={{ width: `${(expected / max) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[var(--color-muted)]">Actual</span>
            <span className="tabular-nums font-medium text-[var(--color-ink)]">
              {formatINR(actual)}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-[var(--color-paper)]">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(actual / max) * 100}%`,
                backgroundColor: higher
                  ? "var(--color-severity-high)"
                  : "var(--color-severity-medium)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
