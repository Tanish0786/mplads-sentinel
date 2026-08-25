import type { ReactNode } from "react";

export function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  caption,
  onClick,
  active,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  caption?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl border bg-[var(--color-panel)] p-4 text-left transition-colors ${
        active ? "border-[var(--color-brand)]" : "border-[var(--color-border)]"
      } ${onClick ? "cursor-pointer hover:bg-[var(--color-paper)]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
            {value}
          </p>
        </div>
      </div>
      {caption && <p className="mt-2 text-xs text-[var(--color-muted)]">{caption}</p>}
    </Tag>
  );
}
