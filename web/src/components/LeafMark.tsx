export function LeafMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 20C4 11 10 4 20 4c0 10-7 16-16 16Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M5 19C10 13 14 9 19 5"
        stroke="var(--color-brand-dark)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
