// Pulls the live MP-level MPLADS allocation dataset from the official
// pre-login dashboard at https://mplads.mospi.gov.in/digigov/dashboard.html.
//
// The site is a ZK-framework app: its "REST" endpoints are actually
// session/desktop-bound AU handlers, not stateless REST, so a plain HTTP
// client can't call them directly (confirmed: POSTing to them without a
// live ZK desktop session returns a 500). We drive a real headless
// browser to load the dashboard and capture the network responses the
// page itself receives — the same JSON a user's browser gets. Nothing
// here is synthesized.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "raw");
mkdirSync(RAW_DIR, { recursive: true });

const DASHBOARD_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html";

async function fetchData() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();

  const captured = {};
  page.on("response", async (response) => {
    const url = response.url();
    if (response.request().method() !== "POST") return;
    if (url.includes("PreLoginDashboardData/getTilesData")) {
      captured.tiles = await response.text();
    } else if (url.includes("PreLoginDashboardData/getTilesReportData")) {
      captured.report = await response.text();
    }
  });

  await page.goto(DASHBOARD_URL, { waitUntil: "load", timeout: 60000 });

  const deadline = Date.now() + 30000;
  while ((!captured.tiles || !captured.report) && Date.now() < deadline) {
    await page.waitForTimeout(500);
  }
  await browser.close();

  if (!captured.tiles || !captured.report) {
    throw new Error(
      `Did not capture expected API responses. Got keys: ${Object.keys(captured)}`
    );
  }

  const tiles = JSON.parse(captured.tiles);
  const reportWrapper = JSON.parse(captured.report);
  const allocatedKey = Object.keys(reportWrapper).find((k) =>
    k.includes("Allocated")
  );
  const mps = JSON.parse(reportWrapper[allocatedKey]);

  const fetchedAt = new Date().toISOString();

  writeFileSync(
    join(RAW_DIR, "tiles.json"),
    JSON.stringify({ fetched_at: fetchedAt, data: tiles }, null, 2)
  );
  writeFileSync(
    join(RAW_DIR, "mp_allocations.json"),
    JSON.stringify({ fetched_at: fetchedAt, data: mps }, null, 2)
  );

  console.log(`Fetched ${mps.length} MP allocation records and national tiles.`);
  console.log(`Saved to ${RAW_DIR}`);
}

fetchData().catch((err) => {
  console.error(err);
  process.exit(1);
});
