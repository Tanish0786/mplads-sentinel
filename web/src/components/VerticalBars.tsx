interface Bar {
  label: string;
  value: number;
  color: string;
}

export function VerticalBars({ bars, height = 140 }: { bars: Bar[]; height?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="flex items-end justify-center gap-8" style={{ height }}>
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
            {b.value.toLocaleString("en-IN")}
          </span>
          <div
            className="w-12 rounded-t-md"
            style={{
              height: Math.max(4, (b.value / max) * (height - 50)),
              backgroundColor: b.color,
            }}
          />
          <span className="text-xs text-[var(--color-muted)]">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
