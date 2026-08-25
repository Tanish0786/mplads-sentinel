interface Segment {
  label: string;
  value: number;
  color: string;
}

export function StackedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-[var(--color-paper)]">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value} (${((s.value / total) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[var(--color-ink)]">{s.label}</span>
            <span className="tabular-nums text-[var(--color-muted)]">
              {s.value} ({((s.value / total) * 100).toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
