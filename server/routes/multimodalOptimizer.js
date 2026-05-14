// Multimodal optimization solver across truck/rail/ocean/air with
// cost/service-level trade-offs.
// Audit: batch_04.md / AIFreightPricingAgent / Custom Feature Suggestions #2
const express = require('express');
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');

const router = express.Router();

// POST /api/multimodal-optimize/quote
// Body: { origin, destination, weight_kg, cube_m3?, value_usd?, deadline_days?, modes_allowed? }
router.post('/quote', async (req, res) => {
  try {
    const {
      origin, destination,
      weight_kg, cube_m3,
      value_usd, deadline_days,
      modes_allowed = ['truck', 'rail', 'ocean', 'air', 'parcel']
    } = req.body || {};

    if (!origin || !destination || !weight_kg) {
      return res.status(400).json({ error: 'origin, destination, and weight_kg required' });
    }

    let carriers = { rows: [] };
    let rules = { rows: [] };
    try {
      carriers = await db.query(`SELECT id, name, modes, lanes FROM carriers LIMIT 50`);
    } catch (_) {}
    try {
      rules = await db.query(`SELECT id, name, mode, multiplier FROM pricing_rules LIMIT 30`);
    } catch (_) {}

    const systemPrompt = `You are a multimodal freight optimizer. Compare modes (truck, rail, ocean, air, parcel)
on cost, transit time, reliability, and carbon. Recommend the best option and viable alternates. Return STRICT JSON only.`;

    const userPrompt = `Origin: ${origin}
Destination: ${destination}
Weight (kg): ${weight_kg}
Cube (m^3): ${cube_m3 || 'unspecified'}
Declared value (USD): ${value_usd || 'unspecified'}
Deadline (days): ${deadline_days || 'flexible'}
Modes allowed: ${modes_allowed.join(', ')}

Carrier roster (sample): ${JSON.stringify(carriers.rows.slice(0, 15))}
Pricing rules (sample): ${JSON.stringify(rules.rows.slice(0, 15))}

Return JSON:
{
  "summary": "...",
  "recommended": { "mode": "truck|rail|ocean|air|parcel|intermodal", "carrier_hint": "string", "estimated_cost_usd": 0, "estimated_transit_days": 0, "rationale": "string" },
  "alternatives": [{ "mode": "string", "estimated_cost_usd": 0, "estimated_transit_days": 0, "carbon_kg_co2e": 0, "tradeoff": "string" }],
  "service_level_table": [{ "mode": "string", "reliability_pct": 0, "carbon_kg_co2e": 0 }],
  "risks": ["..."],
  "disclaimer": "Quotes are AI-estimated; bind with carrier APIs before commit."
}`;

    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { notes: raw };
    res.json({
      query: { origin, destination, weight_kg, cube_m3, deadline_days },
      ai_quote: parsed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/multimodal-optimize/carriers
router.get('/carriers', async (_req, res) => {
  try {
    const r = await db.query(`SELECT id, name, modes FROM carriers LIMIT 100`)
      .catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
