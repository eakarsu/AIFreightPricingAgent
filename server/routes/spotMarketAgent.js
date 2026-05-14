// Agentic spot-market trading agent monitoring rates and auto-adjusting
// pricing rules.
// Audit: batch_04.md / AIFreightPricingAgent / Custom Feature Suggestions #1
const express = require('express');
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');

const router = express.Router();

// POST /api/spot-market/scan { lane?, mode?, horizon_hours? }
router.post('/scan', async (req, res) => {
  try {
    const { lane, mode = 'truck', horizon_hours = 24 } = req.body || {};

    let recentQuotes = { rows: [] };
    let market = { rows: [] };
    let rules = { rows: [] };
    try {
      recentQuotes = await db.query(
        `SELECT * FROM rate_quotes ORDER BY created_at DESC LIMIT 50`
      );
    } catch (_) {}
    try {
      market = await db.query(
        `SELECT * FROM market_intelligence ORDER BY captured_at DESC LIMIT 50`
      );
    } catch (_) {}
    try {
      rules = await db.query(`SELECT * FROM pricing_rules ORDER BY id DESC LIMIT 50`);
    } catch (_) {}

    const systemPrompt = `You are an agentic freight spot-market trading agent. You monitor spot rates, capacity
signals, and existing pricing rules. Recommend rule adjustments (multipliers, fuel surcharge, accessorials)
that capture margin while staying competitive. Return STRICT JSON only.`;

    const userPrompt = `Lane filter: ${lane || 'all'}
Mode: ${mode}
Horizon (hours): ${horizon_hours}
Recent quotes (sample): ${JSON.stringify(recentQuotes.rows.slice(0, 15))}
Market intelligence (sample): ${JSON.stringify(market.rows.slice(0, 15))}
Existing pricing rules (sample): ${JSON.stringify(rules.rows.slice(0, 15))}

Return JSON:
{
  "summary": "...",
  "rate_adjustments": [
    { "lane": "string", "mode": "string", "direction": "up|down|hold", "delta_pct": 0, "rationale": "string", "expires_in_hours": 0 }
  ],
  "new_rule_proposals": [{ "name": "string", "condition": "string", "action": "string", "priority": "low|medium|high" }],
  "capacity_signals": [{ "lane": "string", "indicator": "tightening|loosening", "evidence": "string" }],
  "competitive_risks": ["..."],
  "agent_actions_taken": ["..."],
  "disclaimer": "Recommendations only; require pricing-manager approval before publishing."
}`;

    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { notes: raw };

    try {
      await db.query(
        `INSERT INTO audit_trail (user_id, action, resource, details, created_at)
         VALUES ($1, 'spot_market_scan', 'pricing_rules', $2, NOW())`,
        [req.user?.id || null, JSON.stringify({ lane, mode, recommendations_count: (parsed.rate_adjustments || []).length })]
      ).catch(() => {});
    } catch (_) {}

    res.json({ lane: lane || null, mode, horizon_hours, ai_analysis: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/spot-market/recent-quotes
router.get('/recent-quotes', async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM rate_quotes ORDER BY created_at DESC LIMIT 50`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
