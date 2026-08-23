# MPLADS Anomaly & Fraud Detection Dashboard — Project Brief

Read this whole file before writing any code. It's the full spec for a Smart India Hackathon 2026 (college internal round) build.

## 1. Official problem statement

- **PS ID:** SIH26102
- **Title:** "Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation regd."
- **Organization:** Ministry of Statistics and Programme Implementation (MoSPI), Data Informatics & Innovation Division
- **Category:** Software
- **Real public dataset:** https://mplads.mospi.gov.in/digigov/dashboard.html

## 2. Background

MPLADS (Members of Parliament Local Area Development Scheme) gives each MP funds to approve local development works — roads, buildings, water facilities — across thousands of projects nationwide. Today there is no AI or anomaly-detection layer on top of this: MPs and officials only have a passive fund-tracking portal (eSAKSHI) plus periodic manual CAG audits that surface problems long after the money is spent. MoSPI published this exact problem statement because that capability doesn't exist yet — that's the direct answer if a judge asks "isn't this already built?"

## 3. What to build

A working dashboard that:

1. Pulls real data from the MPLADS dataset link above (fetch and inspect the actual structure first — don't assume a schema).
2. Runs genuine, non-faked anomaly-detection logic on it. Start simple and real, not fake and impressive:
   - Cost overrun vs. sanctioned amount outliers
   - Unusual project delays
   - Duplicate or near-duplicate works
   - Stalled fund utilization
3. Surfaces flagged cases in a dashboard with:
   - A severity indicator per flagged case (not decorative — functional)
   - Drill-down detail per case
   - A plain-English line explaining *why* each case was flagged (this is the "AI" moment judges look for — a simple rule-based explanation is fine, an LLM-generated explanation is even better)
4. Shows a headline, quantifiable impact number — e.g. "₹X crore in anomalous spending flagged across Y works" — this is the single most important number on the page.

**Non-negotiable:** every number on screen must come from real computed logic on real pulled data. No hardcoded or mocked results anywhere in the demo path — this is the one thing that loses a round if a judge asks a follow-up question.

## 4. Scope discipline

This is a single-day build (~15 hours, with a mid-evaluation checkpoint partway through). Get one clean end-to-end flow working first — real data in, real flags out, shown on a real dashboard — before adding anything else. A second detection signal, a trend view, or a predictive angle are good stretch goals only if the core flow is solid and there's time left.

## 5. Team

- Primary builder is strongest at frontend/web development — own the dashboard UI and the overall demo experience.
- 2–3 teammates help with backend/detection logic — the real anomaly rules running on real data.
- Split work by layer (frontend vs. backend/logic), not by feature, so people can build in parallel without blocking each other.
- Pitch deck and live presentation are handled by a separate team — the build team's only job is a working, polished demo.

## 6. Design direction

The dashboard should read as a credible, official government analytics tool — not a flashy consumer app:

- Clean, data-dense layout
- Tabular/aligned numbers wherever money figures or IDs line up in columns
- Semantic color used functionally for severity (red/amber/green), separate from any accent color — never purely decorative
- A subtle, low-opacity background watermark (official emblem/seal style) — reinforces institutional trust, must never interfere with data readability
- Serious, restrained typography — legibility over cleverness
- Avoid generic AI-generated design clichés: gradient hero banners, glassmorphism, everything centered, rounded-everything cards

## 7. Where to start

1. Fetch and explore the real MPLADS dataset from the link above. Understand the actual fields, formats, and data quality before designing anything.
2. Propose a lean, fast-to-build tech stack suited for a small team on a tight timeline (favor something that minimizes frontend/backend integration overhead).
3. Scaffold the project.
4. Build the one hero flow end-to-end before touching polish or secondary features.

## 8. Judge Q&A — pre-written answers

**"Isn't this already built?"**
No. MPLADS has a passive tracking portal (eSAKSHI) and periodic CAG audits — no AI/anomaly detection layer. MoSPI's own problem statement says they need one. AI fraud detection exists broadly in banking/finance, but not applied to MPLADS's own data — that's the actual gap being filled.

**"How is this different from every other AI fraud detector?"**
It runs on this scheme's real, live public data, with explainable (not black-box) flags, tied to a concrete rupee-value impact number — not a generic accuracy percentage on synthetic data.

**"What's next / how would this scale?"**
[Fill in once the prototype is working — e.g. integration with eSAKSHI directly, expansion to other centrally-sponsored schemes, predictive risk scoring before funds are disbursed.]