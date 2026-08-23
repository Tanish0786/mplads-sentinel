import type { Severity } from "../types";

const styles: Record<Severity, string> = {
  high: "bg-[#a4231d]/10 text-[#a4231d] border-[#a4231d]/30",
  medium: "bg-[#b3660a]/10 text-[#b3660a] border-[#b3660a]/30",
  low: "bg-[#4a7a3a]/10 text-[#4a7a3a] border-[#4a7a3a]/30",
};

const labels: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          severity === "high"
            ? "bg-[#a4231d]"
            : severity === "medium"
              ? "bg-[#b3660a]"
              : "bg-[#4a7a3a]"
        }`}
      />
      {labels[severity]}
    </span>
  );
}
