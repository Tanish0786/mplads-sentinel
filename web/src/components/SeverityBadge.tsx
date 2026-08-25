import type { Severity } from "../types";

const styles: Record<Severity, string> = {
  high: "bg-[#a4231d]/10 text-[#a4231d]",
  medium: "bg-[#b3660a]/10 text-[#b3660a]",
  low: "bg-[#4a7a3a]/10 text-[#4a7a3a]",
};

const labels: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (severity === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
        No flag
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}
