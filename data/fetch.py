"""Pulls the live MP-level MPLADS allocation dataset from the official
pre-login dashboard at https://mplads.mospi.gov.in/digigov/dashboard.html.

The site is a ZK-framework app: its "REST" endpoints are actually
session/desktop-bound AU handlers, not stateless REST, so a plain HTTP
client can't call them directly. We drive a real (headless) browser to
load the dashboard, capture the network responses the page itself makes,
and save the raw JSON payloads. This is the same data a user's browser
receives — nothing here is synthesized.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

DASHBOARD_URL = "https://mplads.mospi.gov.in/digigov/dashboard.html"
RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)


def fetch() -> None:
    captured: dict[str, str] = {}

    def on_response(response):
        url = response.url
        if "PreLoginDashboardData/getTilesData" in url and response.request.method == "POST":
            captured["tiles"] = response.text()
        elif "PreLoginDashboardData/getTilesReportData" in url and response.request.method == "POST":
            captured["report"] = response.text()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("response", on_response)
        page.goto(DASHBOARD_URL, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(2000)
        browser.close()

    if "tiles" not in captured or "report" not in captured:
        raise RuntimeError(
            f"Did not capture expected API responses. Got keys: {list(captured)}"
        )

    tiles = json.loads(captured["tiles"])
    report_wrapper = json.loads(captured["report"])
    # The "Allocated Limit" value is itself a JSON string (escaped) — the
    # ZK grid encodes its data source as a nested JSON string.
    allocated_key = next(k for k in report_wrapper if "Allocated" in k)
    mps = json.loads(report_wrapper[allocated_key])

    fetched_at = datetime.now(timezone.utc).isoformat()

    (RAW_DIR / "tiles.json").write_text(
        json.dumps({"fetched_at": fetched_at, "data": tiles}, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "mp_allocations.json").write_text(
        json.dumps({"fetched_at": fetched_at, "data": mps}, indent=2), encoding="utf-8"
    )

    print(f"Fetched {len(mps)} MP allocation records and national tiles.")
    print(f"Saved to {RAW_DIR}")


if __name__ == "__main__":
    fetch()
