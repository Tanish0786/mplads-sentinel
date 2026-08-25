import type { ReactNode } from "react";
import { LeafMark } from "./LeafMark";
import type { Route } from "../router";

interface NavItem {
  route: Route;
  label: string;
  icon: (className: string) => ReactNode;
}

const icons = {
  dashboard: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1" />
    </svg>
  ),
  anomalies: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  mps: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" strokeLinecap="round" />
      <circle cx="17.5" cy="7.5" r="2.4" opacity="0.7" />
      <path d="M15.7 13.3c2.6.3 4.3 2.4 4.3 5.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  ),
  analytics: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
    </svg>
  ),
  reports: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  ),
  alerts: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.6 2.9-1.6 4h13.2c-1-1.1-1.6-2.5-1.6-4V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  ),
  settings: (c: string) => (
    <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" strokeLinejoin="round" />
    </svg>
  ),
} as const;

const NAV_ITEMS: NavItem[] = [
  { route: "dashboard", label: "Dashboard", icon: icons.dashboard },
  { route: "anomalies", label: "Anomalies", icon: icons.anomalies },
  { route: "mps", label: "MPs Overview", icon: icons.mps },
  { route: "analytics", label: "Analytics", icon: icons.analytics },
  { route: "reports", label: "Reports", icon: icons.reports },
  { route: "alerts", label: "Alerts", icon: icons.alerts },
  { route: "settings", label: "Settings", icon: icons.settings },
];

export function Sidebar({
  active,
  onNavigate,
  badges = {},
}: {
  active: Route;
  onNavigate: (route: Route) => void;
  badges?: Partial<Record<Route, number>>;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
          <LeafMark className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
            Tech Leaf JUIT
          </p>
          <p className="text-[10px] leading-tight text-[var(--color-muted)]">
            MPLADS Fraud &amp; Anomaly Detection System
          </p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.route === active;
          const badge = badges[item.route];
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-brand-light)] font-medium text-[var(--color-brand-dark)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.icon(
                `h-4 w-4 shrink-0 ${isActive ? "text-[var(--color-brand)]" : "text-[var(--color-muted)]"}`,
              )}
              <span className="flex-1">{item.label}</span>
              {!!badge && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--color-severity-high)] px-1 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-dark)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" strokeLinejoin="round" />
          </svg>
          Real, live data
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">
          Every number here comes from the MPLADS public dashboard — nothing
          is simulated.
        </p>
      </div>

      <div className="border-t border-[var(--color-border)] px-5 py-3 text-[10px] leading-relaxed text-[var(--color-muted)]">
        © 2026 Tech Leaf JUIT
      </div>
    </aside>
  );
}
