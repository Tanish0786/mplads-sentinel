interface StateCell {
  state: string;
  abbr: string;
  row: number;
  col: number;
}

// Simplified grid cartogram — each state placed at its approximate
// real-world relative position (north→south, west→east), not literal
// coastline geometry. A standard technique for state-level choropleths
// where precise boundary paths aren't available.
const GRID: StateCell[] = [
  { state: "Jammu And Kashmir", abbr: "JK", row: 0, col: 3 },
  { state: "Ladakh", abbr: "LA", row: 0, col: 4 },
  { state: "Punjab", abbr: "PB", row: 1, col: 2 },
  { state: "Himachal Pradesh", abbr: "HP", row: 1, col: 3 },
  { state: "Arunachal Pradesh", abbr: "AR", row: 1, col: 7 },
  { state: "Chandigarh", abbr: "CH", row: 2, col: 2 },
  { state: "Uttarakhand", abbr: "UK", row: 2, col: 3 },
  { state: "Sikkim", abbr: "SK", row: 2, col: 6 },
  { state: "Nagaland", abbr: "NL", row: 2, col: 8 },
  { state: "Rajasthan", abbr: "RJ", row: 3, col: 1 },
  { state: "Haryana", abbr: "HR", row: 3, col: 2 },
  { state: "Delhi", abbr: "DL", row: 3, col: 3 },
  { state: "Uttar Pradesh", abbr: "UP", row: 3, col: 4 },
  { state: "Assam", abbr: "AS", row: 3, col: 6 },
  { state: "Meghalaya", abbr: "ML", row: 3, col: 7 },
  { state: "Gujarat", abbr: "GJ", row: 4, col: 0 },
  { state: "Madhya Pradesh", abbr: "MP", row: 4, col: 1 },
  { state: "Jharkhand", abbr: "JH", row: 4, col: 3 },
  { state: "Bihar", abbr: "BR", row: 4, col: 4 },
  { state: "West Bengal", abbr: "WB", row: 4, col: 5 },
  { state: "Tripura", abbr: "TR", row: 4, col: 7 },
  { state: "Manipur", abbr: "MN", row: 4, col: 8 },
  { state: "The Dadra And Nagar Haveli And Daman And Diu", abbr: "DN", row: 5, col: 0 },
  { state: "Maharashtra", abbr: "MH", row: 5, col: 1 },
  { state: "Chhattisgarh", abbr: "CG", row: 5, col: 3 },
  { state: "Odisha", abbr: "OD", row: 5, col: 4 },
  { state: "Mizoram", abbr: "MZ", row: 5, col: 8 },
  { state: "Goa", abbr: "GA", row: 6, col: 0 },
  { state: "Karnataka", abbr: "KA", row: 6, col: 1 },
  { state: "Telangana", abbr: "TS", row: 6, col: 3 },
  { state: "Andhra Pradesh", abbr: "AP", row: 6, col: 4 },
  { state: "Lakshadweep", abbr: "LD", row: 7, col: 0 },
  { state: "Kerala", abbr: "KL", row: 7, col: 1 },
  { state: "Tamil Nadu", abbr: "TN", row: 7, col: 2 },
  { state: "Puducherry", abbr: "PY", row: 7, col: 3 },
  { state: "Andaman And Nicobar Islands", abbr: "AN", row: 8, col: 5 },
];

const ROWS = 9;
const COLS = 9;

function colorFor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "var(--color-paper)";
  const t = Math.min(1, value / max);
  // Interpolate from a light amber to the severity-high red.
  const from = { r: 253, g: 230, b: 138 };
  const to = { r: 164, g: 35, b: 29 };
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r},${g},${b})`;
}

export function IndiaGridMap({ values }: { values: Record<string, number> }) {
  const max = Math.max(0, ...Object.values(values));

  return (
    <div>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
      >
        {GRID.map((cell) => {
          const value = values[cell.state] ?? 0;
          return (
            <div
              key={cell.state}
              title={`${cell.state}: ₹${(value / 1e7).toFixed(2)} Cr flagged`}
              className="flex items-center justify-center rounded-[3px] text-[9px] font-semibold text-[var(--color-ink)]"
              style={{
                gridRowStart: cell.row + 1,
                gridColumnStart: cell.col + 1,
                backgroundColor: colorFor(value, max),
              }}
            >
              {cell.abbr}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
        <span>Less flagged</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(to right, #fde68a, #a4231d)" }} />
        <span>More flagged</span>
      </div>
    </div>
  );
}
