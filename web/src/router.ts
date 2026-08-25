import { useEffect, useState } from "react";

export type Route =
  | "dashboard"
  | "anomalies"
  | "mps"
  | "analytics"
  | "reports"
  | "alerts"
  | "settings";

const VALID_ROUTES: Route[] = [
  "dashboard",
  "anomalies",
  "mps",
  "analytics",
  "reports",
  "alerts",
  "settings",
];

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (VALID_ROUTES as string[]).includes(raw) ? (raw as Route) : "dashboard";
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = `/${next}`;
  };

  return [route, navigate];
}
