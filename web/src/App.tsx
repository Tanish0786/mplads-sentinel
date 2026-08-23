import { useEffect, useMemo, useState } from "react";
import type { FlaggedCase, Severity, Summary } from "./types";
import { Watermark } from "./components/Watermark";
import { SeverityBadge } from "./components/SeverityBadge";
import { formatINR, formatCrore, formatPct } from "./format";

type SeverityFilter = "all" | Severity;

function useData() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cases, setCases] = useState<FlaggedCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/summary.json").then((r) => {
        if (!r.ok) throw new Error("summary.json not found");
        return r.json();
      }),
      fetch("/data/cases.json").then((r) => {
        if (!r.ok) throw new Error("cases.json not found");
        return r.json();
      }),
    ])
      .then(([s, c]) => {
        setSummary(s);
        setCases(c);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  return { summary, cases, error };
}

export default function App() {
  const { summary, cases, error } = useData();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FlaggedCase | null>(null);

  const filtered = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => {
      if (severityFilter !== "all" && c.severity !== severityFilter) return false;
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
  }, [cases, severityFilter, query]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] px-6 text-center">
        <div className="max-w-md">
          <p className="font-semibold text-[var(--color-severity-high)]">
            Could not load detection output
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Run the data pipeline (data/fetch.py then data/detect.py) to
            generate web/public/data/summary.json and cases.json.
          </p>
        </div>
      </div>
    );
  }

  if (!summary || !cases) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Watermark />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-accent)] text-[var(--color-accent)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Zm0 2.2 7 3.1v4.7c0 3.9-2.9 6.9-7 8-4.1-1.1-7-4.1-7-8V7.3l7-3.1Z" />
                <path d="M11 12.6 9.1 10.7l-1.4 1.4L11 15.4l5.3-5.3-1.4-1.4Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                MPLADS Sentinel
              </h1>
              <p className="text-xs text-[var(--color-muted)]">
                Anomaly &amp; Fraud Detection · Ministry of Statistics &amp;
                Programme Implementation dataset
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--color-muted)]">
            <p>
              Source:{" "}
              <a
                className="underline decoration-dotted"
                href={summary.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {summary.source.name}
              </a>
            </p>
            <p>Generated {new Date(summary.generated_at).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Headline impact number */}
        <section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Headline finding
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-[var(--color-ink)] sm:text-5xl">
            {summary.headline.flagged_amount_display} in anomalous allocations
            flagged
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            across {summary.headline.flagged_count} of{" "}
            {summary.headline.total_mps} MPs scanned, against{" "}
            {summary.headline.total_allocated_display} in total MPLADS funds
            allocated to the 18th Lok Sabha / Rajya Sabha.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-6 sm:grid-cols-4">
            <Stat label="MPs scanned" value={summary.headline.total_mps.toLocaleString("en-IN")} />
            <Stat
              label="Total allocated"
              value={summary.headline.total_allocated_display}
            />
            <Stat
              label="Flagged cases"
              value={summary.headline.flagged_count.toLocaleString("en-IN")}
            />
            <Stat
              label="High severity"
              value={summary.severity_counts.high.toLocaleString("en-IN")}
              accent
            />
          </div>
        </section>

        {/* Severity breakdown */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          <SeverityCard
            severity="high"
            count={summary.severity_counts.high}
            active={severityFilter === "high"}
            onClick={() =>
              setSeverityFilter(severityFilter === "high" ? "all" : "high")
            }
          />
          <SeverityCard
            severity="medium"
            count={summary.severity_counts.medium}
            active={severityFilter === "medium"}
            onClick={() =>
              setSeverityFilter(severityFilter === "medium" ? "all" : "medium")
            }
          />
          <SeverityCard
            severity="low"
            count={summary.severity_counts.low}
            active={severityFilter === "low"}
            onClick={() =>
              setSeverityFilter(severityFilter === "low" ? "all" : "low")
            }
          />
        </section>

        {/* Case table */}
        <section className="mt-6 border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
              Flagged cases {severityFilter !== "all" && `· ${severityFilter}`}
            </h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search MP, state, or constituency…"
              className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] sm:w-72"
            />
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
                      <SeverityBadge severity={c.severity} />
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
                    <td className="px-4 py-2.5 text-[var(--color-muted)]">
                      {c.flag_label}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--color-muted)]"
                    >
                      No flagged cases match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </main>

      {selected && (
        <CaseDetail case={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? "text-[var(--color-severity-high)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SeverityCard({
  severity,
  count,
  active,
  onClick,
}: {
  severity: Severity;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const color =
    severity === "high"
      ? "var(--color-severity-high)"
      : severity === "medium"
        ? "var(--color-severity-medium)"
        : "var(--color-severity-low)";
  return (
    <button
      onClick={onClick}
      className={`border bg-[var(--color-panel)] p-4 text-left transition-colors ${
        active ? "border-current" : "border-[var(--color-border)]"
      }`}
      style={{ color: active ? color : undefined }}
    >
      <div className="flex items-center justify-between">
        <SeverityBadge severity={severity} />
        <span className="text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
          {count}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {severity === "high" &&
          "Large, unexplained deviation from the statistical norm."}
        {severity === "medium" && "Moderate deviation warranting review."}
        {severity === "low" && "Minor deviation, likely explainable."}
      </p>
    </button>
  );
}

function CaseDetail({
  case: c,
  onClose,
}: {
  case: FlaggedCase;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-panel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <SeverityBadge severity={c.severity} />
            <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {c.mp_name}
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              {c.house} · {c.constituency}, {c.state}
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
            Why this was flagged
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
            {c.explanation}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Allocated amount</dt>
            <dd className="mt-0.5 tabular-nums font-medium">
              {formatINR(c.allocated_amt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Cohort baseline</dt>
            <dd className="mt-0.5 tabular-nums font-medium">
              {formatINR(c.cohort_baseline)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Deviation</dt>
            <dd className="mt-0.5 tabular-nums font-medium">
              {formatPct(c.deviation_pct)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Flag type</dt>
            <dd className="mt-0.5 font-medium">{c.flag_label}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure start</dt>
            <dd className="mt-0.5">
              {new Date(c.tenure_start).toLocaleDateString("en-IN")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Tenure end</dt>
            <dd className="mt-0.5">
              {new Date(c.tenure_end).toLocaleDateString("en-IN")}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
