# MPLADS Sentinel

Anomaly & fraud-signal detection for India's Members of Parliament Local Area
Development Scheme (MPLADS), built on data pulled live from the official
[MPLADS eSAKSHI public dashboard](https://mplads.mospi.gov.in/digigov/dashboard.html)
(Ministry of Statistics and Programme Implementation).

The public pre-login dashboard exposes MP-level allocation data (state, MP
name, constituency, house, allocated amount, tenure window) for all 543
sitting MPs — not per-work project records. Given that constraint, v1 scope
is statistical outlier detection on allocations against real cohort norms,
plus data-integrity checks, rather than per-work cost/delay analysis.

## What it flags

- **Allocation cohort deviation** — an MP's allocated amount compared against
  the real baseline for other members sharing an identical tenure window in
  their House (or a pro-rated expectation, for members outside the standard
  term).
- **Duplicate constituency records** — more than one MP allocation record for
  the same constituency/house, which shouldn't happen outside a resolved
  mid-term replacement.

## Structure

```
data/
  fetch.mjs       # Node + Playwright: pulls live data from the ZK-session-based dashboard
  detect.py       # Python (stdlib only): runs detection rules, writes web/public/data/*.json
  raw/            # fetched raw JSON (gitignored, regenerate with fetch.mjs)
web/
  src/            # React + Vite + TypeScript dashboard
  public/data/    # summary.json + cases.json consumed by the frontend
```

## Attribution

The India state map on the Analytics page uses real state boundary paths
from [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india)
(github.com/VictorCazanave/svg-maps), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Running it

```bash
# 1. Fetch live data (writes data/raw/mp_allocations.json)
cd data && npm install && node fetch.mjs

# 2. Run detection (writes web/public/data/summary.json + cases.json)
python detect.py

# 3. Run the dashboard
cd ../web && npm install && npm run dev
```
