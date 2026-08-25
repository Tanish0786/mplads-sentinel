import type { ReactNode } from "react";
import type { Summary } from "../types";

export function SettingsPage({ summary }: { summary: Summary }) {
  const rows: { icon: ReactNode; label: string; description: string; value: string }[] = [
    {
      icon: <GlobeIcon />,
      label: "Data source",
      description: "Where every number on this site comes from.",
      value: summary.source.name,
    },
    {
      icon: <ClockIcon />,
      label: "Last scan",
      description: "When the detection pipeline last ran.",
      value: new Date(summary.generated_at).toLocaleString("en-IN"),
    },
    {
      icon: <PeopleIcon />,
      label: "Records scanned",
      description: "MP allocation records pulled from the live dashboard.",
      value: summary.source.record_count.toLocaleString("en-IN"),
    },
    {
      icon: <GaugeIcon />,
      label: "Noise threshold",
      description: "Deviations below this are treated as normal variance, not flagged.",
      value: `±${summary.thresholds.noise_pct}%`,
    },
    {
      icon: <GaugeIcon />,
      label: "Medium severity threshold",
      description: "Deviation magnitude at or above this is Medium severity.",
      value: `${summary.thresholds.medium_pct}%`,
    },
    {
      icon: <GaugeIcon />,
      label: "High severity threshold",
      description: "Deviation magnitude at or above this is High severity.",
      value: `${summary.thresholds.high_pct}%`,
    },
  ];

  return (
    <>
      <p className="text-sm text-[var(--color-muted)]">
        This system has no user accounts or editable configuration — these
        are the actual constants the detection pipeline runs with, shown for
        transparency, not a settings form.
      </p>

      <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="border-b border-[var(--color-border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">System configuration</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]">
                {r.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-ink)]">{r.label}</p>
                <p className="text-xs text-[var(--color-muted)]">{r.description}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">{r.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Known data limitations</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
          <li className="flex gap-2">
            <span className="text-[var(--color-severity-medium)]">•</span>
            The public MPLADS dashboard only exposes MP-level allocation
            totals — no per-work project records, so cost-overrun or
            delay detection at the project level isn't possible with this
            data source.
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-severity-medium)]">•</span>
            The current dataset only includes Lok Sabha members. Rajya
            Sabha allocations weren't part of this fetch.
          </li>
        </ul>
      </section>
    </>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9Z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" strokeLinecap="round" />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 15a8 8 0 1 1 16 0" strokeLinecap="round" />
      <path d="M12 15 16 9" strokeLinecap="round" />
    </svg>
  );
}
