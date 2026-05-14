const router = require('express').Router();
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');
const { persistAIResult } = require('../services/aiResults');

/**
 * POST /api/ai/dynamic-rate
 *
 * Real-time LTL/FTL rate calculator using lane elasticity, capacity utilization,
 * and a fuel surcharge index. AI analyzes inputs and returns a recommended rate.
 *
 * Body: { origin, destination, weight_lbs, mode, equipment, fuel_surcharge_pct?, capacity_utilization_pct?, urgency? }
 */
router.post('/dynamic-rate', async (req, res) => {
  try {
    const {
      origin, destination, weight_lbs,
      mode = 'LTL', equipment = 'dry_van',
      fuel_surcharge_pct = 28, capacity_utilization_pct = 80,
      urgency = 'standard',
    } = req.body || {};
    if (!origin || !destination || !weight_lbs) {
      return res.status(400).json({ error: 'origin, destination, weight_lbs required' });
    }

    const recentLane = await db.query(
      `SELECT mode, AVG(price_per_mile) AS avg_ppm, AVG(total_amount) AS avg_total, COUNT(*) AS n
       FROM rate_quotes
       WHERE origin ILIKE $1 AND destination ILIKE $2
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY mode`,
      [`%${origin}%`, `%${destination}%`]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freight pricing engine. Recommend a dynamic rate. Return STRICT JSON only.';
    const userPrompt = `Inputs:
- Origin: ${origin}
- Destination: ${destination}
- Weight: ${weight_lbs} lbs
- Mode: ${mode}
- Equipment: ${equipment}
- Fuel surcharge: ${fuel_surcharge_pct}%
- Capacity utilization: ${capacity_utilization_pct}%
- Urgency: ${urgency}

Recent lane data: ${JSON.stringify(recentLane.rows)}

Return JSON:
{
  "recommended_total_usd": 0,
  "rate_per_mile_usd": 0,
  "linehaul_usd": 0,
  "fuel_surcharge_usd": 0,
  "accessorials_usd": 0,
  "rationale": "string",
  "confidence_pct": 0,
  "guardrails": { "min_total_usd": 0, "max_total_usd": 0 },
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'rate_quote', analysisType: 'dynamic-rate', raw, parsed });
    res.json({ analysis: parsed || { raw }, lane_history: recentLane.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/ai/carrier-capacity-forecast
 *
 * Predict freight lane capacity utilization to guide rate strategy.
 * Body: { lanes: [{ origin, destination, mode }], horizon_days? }
 */
router.post('/carrier-capacity-forecast', async (req, res) => {
  try {
    const { lanes = [], horizon_days = 30 } = req.body || {};
    if (lanes.length === 0) {
      return res.status(400).json({ error: 'lanes array required' });
    }

    const carriers = await db.query(
      `SELECT id, name, equipment_types, lanes_served, on_time_rate, avg_capacity_utilization
       FROM carriers
       LIMIT 100`
    ).catch(() => ({ rows: [] }));

    const recentVolume = await db.query(
      `SELECT origin, destination, COUNT(*) AS shipment_count,
              AVG(price_per_mile) AS avg_ppm
       FROM shipments
       WHERE created_at >= NOW() - INTERVAL '60 days'
       GROUP BY origin, destination
       ORDER BY shipment_count DESC
       LIMIT 100`
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freight capacity forecaster. Predict per-lane capacity tightness for the requested horizon. Return STRICT JSON only.';
    const userPrompt = `Lanes to forecast: ${JSON.stringify(lanes)}
Horizon: ${horizon_days} days
Carriers (sample): ${JSON.stringify(carriers.rows.slice(0, 30))}
Recent shipment volume by lane: ${JSON.stringify(recentVolume.rows.slice(0, 30))}

Return JSON:
{
  "summary": "string",
  "lane_forecasts": [
    { "origin": "string", "destination": "string", "mode": "string",
      "expected_capacity_pct": 0, "rate_pressure": "rising|stable|falling",
      "recommended_strategy": "lock_capacity|spot|delay" }
  ],
  "risks": ["..."],
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'capacity_forecast', analysisType: 'carrier-capacity-forecast', raw, parsed });
    res.json({ analysis: parsed || { raw } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/ai/lane-profitability
 *
 * Identify unprofitable lanes for discontinuation or repricing.
 */
router.post('/lane-profitability', async (req, res) => {
  try {
    const { lookback_days = 180, min_shipments = 5 } = req.body || {};

    const lanes = await db.query(
      `SELECT origin, destination, mode,
              COUNT(*) AS shipments,
              SUM(total_amount) AS revenue,
              SUM(carrier_cost) AS cost,
              AVG(price_per_mile) AS avg_ppm
       FROM shipments
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY origin, destination, mode
       HAVING COUNT(*) >= $2
       ORDER BY (SUM(total_amount) - COALESCE(SUM(carrier_cost), 0)) ASC
       LIMIT 200`,
      [lookback_days, min_shipments]
    ).catch(() => ({ rows: [] }));

    const enriched = lanes.rows.map(r => {
      const revenue = parseFloat(r.revenue || 0);
      const cost = parseFloat(r.cost || 0);
      const margin = revenue - cost;
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : null;
      return { ...r, margin: parseFloat(margin.toFixed(2)), margin_pct: marginPct !== null ? parseFloat(marginPct.toFixed(2)) : null };
    });

    const systemPrompt = 'You are a freight pricing strategist. Recommend repricing or discontinuation per lane. Return STRICT JSON only.';
    const userPrompt = `Lane profitability (last ${lookback_days} days, min ${min_shipments} shipments):
${JSON.stringify(enriched.slice(0, 100))}

Return JSON:
{
  "summary": "...",
  "discontinue_candidates": [{ "origin":"", "destination":"", "mode":"", "reason":"" }],
  "reprice_candidates": [{ "origin":"", "destination":"", "mode":"", "current_avg_ppm":0, "suggested_avg_ppm":0, "rationale":"" }],
  "expand_candidates": [{ "origin":"", "destination":"", "mode":"", "rationale":"" }],
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'lane_profitability', analysisType: 'lane-profitability', raw, parsed });
    res.json({ lane_count: enriched.length, lanes: enriched, ai_analysis: parsed || { raw } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 503 helper: AI calls without a key throw "OPENROUTER_API_KEY not configured."
// Map that to 503 so the FE can show a configuration hint.
function send503OrErr(res, err) {
  const msg = err?.message || String(err);
  if (/OPENROUTER_API_KEY not configured/i.test(msg)) {
    return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured. Set it in server .env to enable AI.' });
  }
  return res.status(500).json({ error: msg });
}

/**
 * POST /api/ai/contract-optimization
 *
 * Pulls active contracts and recent shipment cost data, asks the AI to flag
 * lanes / customers where the contract rate is materially above market.
 * Body: { customer_id?, lookback_days? }
 */
router.post('/contract-optimization', async (req, res) => {
  try {
    const { customer_id, lookback_days = 180 } = req.body || {};

    const contracts = await db.query(
      `SELECT id, contract_number, customer_id, carrier_id, mode,
              committed_rate, currency, start_date, end_date, status, min_volume
       FROM contracts
       WHERE ($1::int IS NULL OR customer_id = $1::int)
         AND status IN ('active','pending','expiring')
       ORDER BY end_date ASC
       LIMIT 200`,
      [customer_id || null]
    ).catch(() => ({ rows: [] }));

    const benchmark = await db.query(
      `SELECT mode, AVG(quoted_price) AS avg_quote, AVG(actual_cost) AS avg_cost, COUNT(*) AS n
       FROM shipments
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY mode`,
      [lookback_days]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freight contract optimization analyst. Identify overpriced contracts vs. recent market and recommend renegotiation or replacement. Return STRICT JSON only.';
    const userPrompt = `Active contracts: ${JSON.stringify(contracts.rows.slice(0, 60))}
Recent shipment benchmark by mode (${lookback_days}d): ${JSON.stringify(benchmark.rows)}

Return JSON:
{
  "summary": "string",
  "overpriced_contracts": [
    { "contract_id": 0, "contract_number": "", "mode": "", "current_rate": 0,
      "benchmark_rate": 0, "premium_pct": 0, "annual_overpay_estimate_usd": 0,
      "recommended_action": "renegotiate|replace|expire|keep", "rationale": "" }
  ],
  "renewal_alerts": [{ "contract_id": 0, "end_date": "", "action": "" }],
  "estimated_annual_savings_usd": 0,
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'contract_optimization', analysisType: 'contract-optimization', raw, parsed });
    res.json({ contract_count: contracts.rows.length, analysis: parsed || { raw } });
  } catch (err) { send503OrErr(res, err); }
});

/**
 * POST /api/ai/fraud-detection
 *
 * Surfaces suspicious shipment / quote patterns (impossible margins, duplicate
 * tracking numbers, lane anomalies). AI ranks risk and suggests follow-up.
 * Body: { lookback_days? }
 */
router.post('/fraud-detection', async (req, res) => {
  try {
    const { lookback_days = 90 } = req.body || {};

    const recent = await db.query(
      `SELECT id, tracking_number, origin, destination, mode,
              weight_kg, quoted_price, actual_cost, status,
              customer_id, carrier_id, pickup_date, delivery_date, created_at
       FROM shipments
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       ORDER BY created_at DESC
       LIMIT 300`,
      [lookback_days]
    ).catch(() => ({ rows: [] }));

    const dupTracking = await db.query(
      `SELECT tracking_number, COUNT(*) AS n
       FROM shipments
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY tracking_number
       HAVING COUNT(*) > 1
       LIMIT 50`,
      [lookback_days]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freight fraud / anomaly detection analyst. Flag suspicious shipments (negative or impossible margins, duplicate trackings, unusual lane / weight ratios, billing inconsistencies). Return STRICT JSON only.';
    const userPrompt = `Recent shipments (last ${lookback_days}d, sample): ${JSON.stringify(recent.rows.slice(0, 80))}
Duplicate tracking numbers: ${JSON.stringify(dupTracking.rows)}

Return JSON:
{
  "summary": "string",
  "high_risk": [
    { "shipment_id": 0, "tracking_number": "", "risk_score": 0,
      "indicators": ["..."], "recommended_action": "investigate|hold|escalate|monitor" }
  ],
  "duplicate_tracking_concerns": [{ "tracking_number": "", "occurrences": 0, "note": "" }],
  "patterns_detected": ["..."],
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'fraud_scan', analysisType: 'fraud-detection', raw, parsed });
    res.json({ shipment_count: recent.rows.length, duplicate_count: dupTracking.rows.length, analysis: parsed || { raw } });
  } catch (err) { send503OrErr(res, err); }
});

/**
 * POST /api/ai/shipment-mode-recommendation
 *
 * Given shipment specs, AI recommends best mode (parcel, LTL, FTL, intermodal,
 * air, ocean) with cost/time tradeoffs.
 * Body: { origin, destination, weight_kg, volume_cbm?, urgency?, budget_usd?, hazmat?, value_usd? }
 */
router.post('/shipment-mode-recommendation', async (req, res) => {
  try {
    const {
      origin, destination, weight_kg,
      volume_cbm, urgency = 'standard', budget_usd, hazmat = false, value_usd,
    } = req.body || {};
    if (!origin || !destination || !weight_kg) {
      return res.status(400).json({ error: 'origin, destination, weight_kg required' });
    }

    const lanePriors = await db.query(
      `SELECT mode, COUNT(*) AS n,
              AVG(quoted_price) AS avg_price,
              AVG(EXTRACT(EPOCH FROM (delivery_date - pickup_date))/86400) AS avg_transit_days
       FROM shipments
       WHERE origin ILIKE $1 AND destination ILIKE $2
         AND created_at >= NOW() - INTERVAL '180 days'
       GROUP BY mode`,
      [`%${origin}%`, `%${destination}%`]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freight mode-selection optimizer. Given a shipment, score modes (parcel, LTL, FTL, intermodal, air, ocean) on cost, transit time, and risk, then recommend the best one. Return STRICT JSON only.';
    const userPrompt = `Shipment:
- Origin: ${origin}
- Destination: ${destination}
- Weight: ${weight_kg} kg
- Volume: ${volume_cbm || 'unknown'} cbm
- Urgency: ${urgency}
- Budget: ${budget_usd ?? 'unspecified'}
- Hazmat: ${hazmat}
- Declared value: ${value_usd ?? 'unspecified'}

Historical lane data: ${JSON.stringify(lanePriors.rows)}

Return JSON:
{
  "recommendation": {
    "mode": "string",
    "rationale": "string",
    "estimated_cost_usd": 0,
    "estimated_transit_days": 0,
    "confidence_pct": 0
  },
  "alternatives": [
    { "mode":"", "estimated_cost_usd":0, "estimated_transit_days":0, "tradeoff":"" }
  ],
  "warnings": ["..."],
  "disclaimer": "string"
}`;
    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);
    await persistAIResult({ userId: req.user?.id, entityType: 'mode_recommendation', analysisType: 'shipment-mode-recommendation', raw, parsed });
    res.json({ analysis: parsed || { raw }, lane_history: lanePriors.rows });
  } catch (err) { send503OrErr(res, err); }
});

module.exports = router;
