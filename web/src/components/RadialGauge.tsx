export function RadialGauge({
  pct,
  label,
  color = "var(--color-brand)",
  size = 160,
}: {
  pct: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const filled = (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" width={size} height={size / 1.8}>
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
        <text x="90" y="82" textAnchor="middle" className="fill-[var(--color-ink)]" fontSize="26" fontWeight="700">
          {clamped.toFixed(1)}%
        </text>
      </svg>
      <p className="-mt-2 text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
