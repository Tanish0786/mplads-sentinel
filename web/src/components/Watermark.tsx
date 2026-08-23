export function Watermark() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <g transform="translate(400,400)" opacity="0.035">
        <circle r="260" fill="none" stroke="#14171c" strokeWidth="2" />
        <circle r="220" fill="none" stroke="#14171c" strokeWidth="1" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const x1 = Math.cos(angle) * 220;
          const y1 = Math.sin(angle) * 220;
          const x2 = Math.cos(angle) * 260;
          const y2 = Math.sin(angle) * 260;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#14171c"
              strokeWidth="1.5"
            />
          );
        })}
        <circle r="120" fill="none" stroke="#14171c" strokeWidth="1.5" />
        <text
          x="0"
          y="10"
          textAnchor="middle"
          fontSize="34"
          fontFamily="Georgia, serif"
          fill="#14171c"
        >
          MPLADS
        </text>
      </g>
    </svg>
  );
}
