import { useEffect, useState } from "react";
import type { FlaggedCase, MPRecord, Summary } from "./types";

function useJSON<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${path} not found`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, [path]);

  return { data, error };
}

export function useDetectionData() {
  const summary = useJSON<Summary>("/data/summary.json");
  const cases = useJSON<FlaggedCase[]>("/data/cases.json");
  return {
    summary: summary.data,
    cases: cases.data,
    error: summary.error ?? cases.error,
  };
}

export function useMPs() {
  const mps = useJSON<MPRecord[]>("/data/mps.json");
  return { mps: mps.data, error: mps.error };
}
