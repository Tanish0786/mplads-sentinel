import { useMemo, useState } from "react";
import type { MPRecord } from "../types";
import { SeverityBadge } from "../components/SeverityBadge";
import { VerticalBars } from "../components/VerticalBars";
import { RadialGauge } from "../components/RadialGauge";
import { KpiCard } from "../components/KpiCard";
import { formatINR, formatCrore, formatPct } from "../format";

type SortKey = "mp_name" | "state" | "allocated_amt" | "deviation_pct";

export function MPsOverview({ mps, stateFilter }: { mps: MPRecord[]; stateFilter: string }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mp_name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<MPRecord | null>(null);

  const scoped = useMemo(
    () => (stateFilter === "all" ? mps : mps.filter((m) => m.state === stateFilter)),
    [mps, stateFilter],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? scoped.filter(
          (m) =>
            m.mp_name.toLowerCase().includes(q) ||
            m.state.toLowerCase().includes(q) ||
            m.constituency.toLowerCase().includes(q),
        )
      : scoped;

    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * sortDir;
      }
      return String(av).localeCompare(String(bv)) * sortDir;
    });
  }, [scoped, query, sortKey, sortDir]);

  const stats = useMemo(() => {
    const totalAllocated = scoped.reduce((sum, m) => sum + m.allocated_amt, 0);
    const flagged = scoped.filter((m) => m.severity !== null).length;
    const highRisk = scoped.filter((m) => m.severity === "high").length;
    const lokSabha = scoped.filter((m) => m.house === "Lok Sabha").length;
    const rajyaSabha = scoped.length - lokSabha;
    const flaggedRate = scoped.length === 0 ? 0 : (flagged / scoped.length) * 100;
    return { totalAllocated, flagged, highRisk, lokSabha, rajyaSabha, flaggedRate };
  }, [scoped]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === 1 ? -1 : 1);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<PeopleIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Total MPs"
          value={scoped.length.toLocaleString("en-IN")}
        />
        <KpiCard
          icon={<RupeeIcon />}
          iconBg="var(--color-brand-light)"
          iconColor="var(--color-brand-dark)"
          label="Total allocation"
          value={`₹${(stats.totalAllocated / 1e7).toFixed(2)} Cr`}
        />
        <KpiCard
          icon={<FlagIcon />}
          iconBg="#fde68a55"
          iconColor="#b3660a"
          label="Flagged MPs"
          value={stats.flagged.toLocaleString("en-IN")}
        />
        <KpiCard
          icon={<AlertIcon />}
          iconBg="#a4231d1a"
          iconColor="#a4231d"
          label="High risk MPs"
          value={stats.highRisk.toLocaleString("en-IN")}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">MPs by House</h2>
          <div className="mt-4">
            <VerticalBars
              bars={[
                { label: "Lok Sabha", value: stats.lokSabha, color: "var(--color-brand)" },
                { label: "Rajya Sabha", value: stats.rajyaSabha, color: "#7c3aed" },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 lg:col-span-2">
          <h2 className="self-start text-sm font-semibold text-[var(--color-ink)]">Flagged MP rate</h2>
          <RadialGauge
            pct={stats.flaggedRate}
            label={`${stats.flagged} of ${scoped.length} MPs flagged`}
            color="var(--color-severity-medium)"
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            MP Directory
          </h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search MP, state, or constituency…"
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)] sm:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <SortableTh label="MP" sortKey="mp_name" active={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-4 py-2 font-medium">House</th>
                <SortableTh label="State / Constituency" sortKey="state" active={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Allocated" sortKey="allocated_amt" align="right" active={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Deviation" sortKey="deviation_pct" align="right" active={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-4 py-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-paper)]"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">
                    {m.mp_name}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-muted)]">{m.house}</td>
                  <td className="px-4 py-2.5 text-[var(--color-muted)]">
                    {m.state} · {m.constituency}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCrore(m.allocated_amt)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatPct(m.deviation_pct)}
                  </td>
                  <td className="px-4 py-2.5">
                    <SeverityBadge severity={m.severity} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                    No MPs match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <MPDetail mp={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function SortableTh({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: 1 | -1;
  onClick: (key: SortKey) => void;
  align?: "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 font-medium hover:text-[var(--color-ink)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onClick(sortKey)}
    >
      {label}
      {isActive && <span className="ml-1">{dir === 1 ? "↑" : "↓"}</span>}
    </th>
  );
}

function MPDetail({ mp, onClose }: { mp: MPRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-panel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <SeverityBadge severity={mp.severity} />
            <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {mp.mp_name}
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              {mp.house} · {mp.constituency}, {mp.state}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Allocation vs. cohort baseline
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
            {mp.cohort_explanation}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Allocated amount</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatINR(mp.allocated_amt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Cohort baseline</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatINR(mp.cohort_baseline)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Deviation</dt>
            <dd className="mt-0.5 tabular-nums font-medium">{formatPct(mp.deviation_pct)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">House</dt>
            <dd className="mt-0.5 font-medium">{mp.house}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure start</dt>
            <dd className="mt-0.5">{new Date(mp.tenure_start).toLocaleDateString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure end</dt>
            <dd className="mt-0.5">{new Date(mp.tenure_end).toLocaleDateString("en-IN")}</dd>
          </div>
        </dl>

        {mp.flags.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Additional flags on this record
            </p>
            <div className="mt-2 space-y-2">
              {mp.flags.map((f, i) => (
                <div key={i} className="border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {f.flag_label}
                    </span>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
                    {f.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" strokeLinecap="round" />
      <circle cx="17.5" cy="7.5" r="2.4" opacity="0.7" />
      <path d="M15.7 13.3c2.6.3 4.3 2.4 4.3 5.2" strokeLinecap="round" opacity="0.7" />
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
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3v18M5 4h12l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
