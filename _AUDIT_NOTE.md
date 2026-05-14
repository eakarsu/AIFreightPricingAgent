# Audit Apply Notes — AIFreightPricingAgent

Audit source: `_AUDIT/reports/batch_04.md` (#4). Verdict: partial-build (13 routes, **0 AI endpoints** — accurate).

Note: existing route files DO use `askAI` internally (rateQuotes, marketIntelligence, carriers, costOptimization), so practical AI is partially present. The audit's "0 AI endpoints" likely reflects no top-level `/api/ai/*` namespace. We added one.

## Implementations applied

Created `server/routes/ai.js` mounted at `/api/ai`:

1. `POST /api/ai/dynamic-rate` — pulls 90-day historical lane data; AI returns recommended total + per-mile rate, fuel breakdown, guardrail min/max.
2. `POST /api/ai/carrier-capacity-forecast` — pulls carriers + recent shipment volume; AI predicts per-lane capacity tightness for a horizon.
3. `POST /api/ai/lane-profitability` — aggregates shipments by lane (revenue/cost/margin); AI suggests discontinue/reprice/expand candidates.

All use existing `askAI`, `parseAIJson`, `persistAIResult`. Schema-tolerant `.catch` on aggregations. Wired into `index.js`. Syntax-checked.

## Backlog (prioritized)

### Mechanical
- `/contract-optimization` — pulls contracts, identifies overpaying lanes.
- `/fraud-detection` — flags suspicious shipment / claim patterns.
- `/shipment-mode-recommendation` — air vs LTL vs parcel optimizer.

### Needs creds / external
- Live spot rate feed (DAT, Truckstop).
- Fuel index feed (DOE).
- FMCSA carrier safety scores.
- Carbon intensity data per carrier.

### Needs product decision
- Payment / billing workflow.
- Customer notification engine.

### Custom features
- Agentic spot market trading.
- Multimodal optimization solver.
- Vision-based damage assessment.

## Apply pass 3 (frontend)

FE already wired. `client/src/pages/AIPricingTools.jsx` has a tool-picker that posts to all three pass-2 endpoints (`/api/ai/dynamic-rate`, `/api/ai/carrier-capacity-forecast`, `/api/ai/lane-profitability`) via the shared `client/src/api/client.js` axios wrapper. No new pages needed; no FE files modified.

## Apply pass 4 (mechanical backlog)

Pulled from the **Mechanical** sub-list of pass-2 backlog (all 3 items implemented):

### Backend (`server/routes/ai.js`)
| # | Endpoint | Reads | Returns |
|---|----------|-------|---------|
| 1 | `POST /api/ai/contract-optimization` | active `contracts`, recent `shipments` benchmark by mode | overpriced contracts, premium %, annual overpay $, renewal alerts, savings estimate |
| 2 | `POST /api/ai/fraud-detection` | recent `shipments` (300), duplicate tracking numbers | high-risk shipments w/ score, indicator list, recommended action; pattern findings |
| 3 | `POST /api/ai/shipment-mode-recommendation` | lane priors from `shipments` | recommended mode + cost/transit + alternatives + warnings |

All three reuse `askAI`, `parseAIJson`, `persistAIResult`. Schema-tolerant `.catch(() => ({rows:[]}))` on every aggregation. New `send503OrErr` helper maps "OPENROUTER_API_KEY not configured" → **503** so the FE can show a config hint (existing endpoints kept their 500 behavior to avoid touching working code). `node --check` clean; `node -e require(...)` lists all 6 routes (3 existing + 3 new).

### Frontend (`client/src/pages/AIPricingTools.jsx`)
Same page, three new tabs added to the existing tab-array (`Contract Optimization`, `Fraud Detection`, `Mode Recommendation`). Three new form-state hooks, three render fns, three branches in the `submit()` switch. 503 responses now surface a hint banner (`Set OPENROUTER_API_KEY in server .env`). All requests still go through the shared axios `client/src/api/client.js` (Bearer JWT via interceptor). esbuild parses cleanly. No new deps; no `npm install`; no other FE files touched.

### Smoke test
Boot blocked by pre-existing `helmet` module not installed in `server/node_modules` (in package.json but not on disk; `npm install` disallowed). Verified instead via:
- `node --check server/routes/ai.js` ✓
- `node -e "require('./server/routes/ai.js')"` lists all 6 POST routes ✓
- esbuild parse of FE page ✓

### Backlog still deferred
Other pass-2 backlog items remain blocked: NEEDS-CREDS (DAT/Truckstop, DOE fuel, FMCSA, carbon), NEEDS-PRODUCT-DECISION (billing, notifications), TOO-RISKY (agentic spot trading, multimodal solver, vision damage).
