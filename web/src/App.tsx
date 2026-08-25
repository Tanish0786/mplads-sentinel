import { useMemo, useState } from "react";
import { Watermark } from "./components/Watermark";
import { Sidebar } from "./components/Sidebar";
import { useRoute, type Route } from "./router";
import { useDetectionData, useMPs } from "./useData";
import { Dashboard } from "./pages/Dashboard";
import { AnomaliesPage } from "./pages/AnomaliesPage";
import { MPsOverview } from "./pages/MPsOverview";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

const PAGE_META: Record<Route, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Real-time overview of MPLADS allocations and detected anomalies",
  },
  anomalies: {
    title: "Anomalies",
    subtitle: "Detect, analyze and investigate potential irregularities and abnormal patterns",
  },
  mps: {
    title: "MPs Overview",
    subtitle: "View and analyze MPLADS allocation data for all Members of Parliament",
  },
  analytics: { title: "Analytics", subtitle: "Real breakdowns of the same detection data, sliced by state and house" },
  reports: { title: "Reports", subtitle: "Export the underlying real data — no fabricated report templates" },
  alerts: { title: "Alerts", subtitle: "New anomalies detected since the last scan" },
  settings: { title: "Settings", subtitle: "Real system configuration and data limitations, not a settings form" },
};

const DETECTION_ROUTES: Route[] = ["dashboard", "anomalies", "alerts", "analytics", "reports", "settings"];
const MPS_ROUTES: Route[] = ["mps", "analytics", "reports"];
const STATE_FILTER_ROUTES: Route[] = ["dashboard", "anomalies", "alerts", "mps", "analytics", "reports"];

export default function App() {
  const [route, navigate] = useRoute();
  const { summary, cases, error: detectionError } = useDetectionData();
  const { mps, error: mpsError } = useMPs();
  const [stateFilter, setStateFilter] = useState<string>("all");

  const needsDetectionData = DETECTION_ROUTES.includes(route);
  const needsMpsData = MPS_ROUTES.includes(route);
  const error = (needsDetectionData && detectionError) || (needsMpsData && mpsError);
  const dataReady =
    (!needsDetectionData || (summary && cases)) && (!needsMpsData || mps);

  const states = useMemo(() => {
    if (!mps) return [];
    return Array.from(new Set(mps.map((m) => m.state))).sort();
  }, [mps]);

  const meta = PAGE_META[route];
  const newCount = summary?.new_since_last_run ?? 0;

  return (
    <div className="relative min-h-screen">
      <Watermark />
      <Sidebar
        active={route}
        onNavigate={navigate}
        badges={{ anomalies: summary?.headline.flagged_count, alerts: newCount || undefined }}
      />

      <div className="pl-60">
        <header className="flex items-center justify-between gap-6 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-8 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              {meta.title}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">{meta.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {states.length > 0 && STATE_FILTER_ROUTES.includes(route) && (
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
              >
                <option value="all">All States</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => navigate("alerts")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              title="New anomalies since last scan"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.6 2.9-1.6 4h13.2c-1-1.1-1.6-2.5-1.6-4V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
                <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
              </svg>
              {newCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--color-severity-high)] px-1 text-[10px] font-semibold text-white">
                  {newCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white py-1 pl-1 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-xs font-semibold text-[var(--color-brand-dark)]">
                A
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-[var(--color-ink)]">Admin User</p>
                <p className="text-[10px] text-[var(--color-muted)]">System Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-8 py-8">
          {error && (
            <div className="border border-[var(--color-severity-high)]/30 bg-[var(--color-severity-high)]/5 p-4 text-sm text-[var(--color-severity-high)]">
              {error}
            </div>
          )}

          {!error && !dataReady && (needsDetectionData || needsMpsData) && (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          )}

          {!error && dataReady && route === "dashboard" && summary && cases && (
            <Dashboard summary={summary} cases={cases} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "anomalies" && summary && cases && (
            <AnomaliesPage summary={summary} cases={cases} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "alerts" && summary && cases && (
            <AlertsPage cases={cases} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "mps" && mps && (
            <MPsOverview mps={mps} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "analytics" && cases && mps && (
            <AnalyticsPage cases={cases} mps={mps} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "reports" && summary && cases && mps && (
            <ReportsPage summary={summary} cases={cases} mps={mps} stateFilter={stateFilter} />
          )}
          {!error && dataReady && route === "settings" && summary && (
            <SettingsPage summary={summary} />
          )}
        </main>
      </div>
    </div>
  );
}
