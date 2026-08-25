import { INDIA_STATE_PATHS, INDIA_VIEWBOX } from "../data/indiaStatePaths";

// Maps our real MPLADS state names to the svg-maps/india path id(s) for
// that state. The Dadra and Nagar Haveli / Daman and Diu UTs were merged
// in 2020 in real life (and in our data), but the underlying map still
// carries them as two separate 1961-era paths, so one real state maps to
// two paths here.
const STATE_TO_PATH_IDS: Record<string, string[]> = {
  "Andaman And Nicobar Islands": ["an"],
  "Andhra Pradesh": ["ap"],
  "Arunachal Pradesh": ["ar"],
  Assam: ["as"],
  Bihar: ["br"],
  Chandigarh: ["ch"],
  Chhattisgarh: ["ct"],
  Delhi: ["dl"],
  Goa: ["ga"],
  Gujarat: ["gj"],
  Haryana: ["hr"],
  "Himachal Pradesh": ["hp"],
  // Ladakh split from J&K in 2019; the underlying map source doesn't yet
  // carry it as a separate region, so both real states shade the "jk" path.
  "Jammu And Kashmir": ["jk"],
  Ladakh: ["jk"],
  Jharkhand: ["jh"],
  Karnataka: ["ka"],
  Kerala: ["kl"],
  Lakshadweep: ["ld"],
  "Madhya Pradesh": ["mp"],
  Maharashtra: ["mh"],
  Manipur: ["mn"],
  Meghalaya: ["ml"],
  Mizoram: ["mz"],
  Nagaland: ["nl"],
  Odisha: ["or"],
  Puducherry: ["py"],
  Punjab: ["pb"],
  Rajasthan: ["rj"],
  Sikkim: ["sk"],
  "Tamil Nadu": ["tn"],
  Telangana: ["tg"],
  "The Dadra And Nagar Haveli And Daman And Diu": ["dn", "dd"],
  Tripura: ["tr"],
  "Uttar Pradesh": ["up"],
  Uttarakhand: ["ut"],
  "West Bengal": ["wb"],
};

function colorFor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "var(--color-paper)";
  const t = Math.min(1, value / max);
  const from = { r: 253, g: 230, b: 138 };
  const to = { r: 164, g: 35, b: 29 };
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r},${g},${b})`;
}

export function IndiaMap({ values }: { values: Record<string, number> }) {
  const pathIdToValue = new Map<string, { value: number; stateNames: string[] }>();
  for (const [stateName, ids] of Object.entries(STATE_TO_PATH_IDS)) {
    const value = values[stateName] ?? 0;
    for (const id of ids) {
      const existing = pathIdToValue.get(id);
      if (existing) {
        existing.value += value;
        existing.stateNames.push(stateName);
      } else {
        pathIdToValue.set(id, { value, stateNames: [stateName] });
      }
    }
  }
  const max = Math.max(0, ...Array.from(pathIdToValue.values()).map((v) => v.value));

  const [, , vbWidth, vbHeight] = INDIA_VIEWBOX.split(" ").map(Number);

  return (
    <div className="w-full">
      <svg
        viewBox={INDIA_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map of India shaded by anomalies flagged per state"
        className="block h-auto w-full max-w-full"
        style={{ aspectRatio: `${vbWidth} / ${vbHeight}` }}
      >
        {INDIA_STATE_PATHS.map((p) => {
          const match = pathIdToValue.get(p.id);
          const value = match?.value ?? 0;
          const stateName = match ? match.stateNames.join(" + ") : p.name;
          return (
            <path
              key={p.id}
              d={p.d}
              fill={colorFor(value, max)}
              stroke="var(--color-panel)"
              strokeWidth="1"
              strokeLinejoin="round"
            >
              <title>
                {stateName}: ₹{(value / 1e7).toFixed(2)} Cr flagged
              </title>
            </path>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
        <span>Less flagged</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(to right, #fde68a, #a4231d)" }} />
        <span>More flagged</span>
      </div>
      <p className="mt-2 text-[10px] text-[var(--color-muted)]">
        Map boundaries: svg-maps/india (CC BY 4.0). Ladakh split from Jammu
        &amp; Kashmir in 2019 and isn't yet a separate region in this map
        source, so it's shown within Jammu &amp; Kashmir's outline.
      </p>
    </div>
  );
}
