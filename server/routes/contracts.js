const router = require('express').Router();
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { persistAIResult } = require('../services/aiResults');

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT ct.*, c.company_name as customer_name, cr.name as carrier_name
      FROM contracts ct
      LEFT JOIN customers c ON ct.customer_id = c.id
      LEFT JOIN carriers cr ON ct.carrier_id = cr.id WHERE 1=1`;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (ct.contract_number ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND ct.status = $${params.length}`; }
    query += ' ORDER BY ct.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ct.*, c.company_name as customer_name, cr.name as carrier_name
       FROM contracts ct LEFT JOIN customers c ON ct.customer_id = c.id LEFT JOIN carriers cr ON ct.carrier_id = cr.id
       WHERE ct.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms } = req.body;
    if (!customer_id || !carrier_id) return res.status(400).json({ error: 'customer_id and carrier_id are required' });
    const result = await db.query(
      `INSERT INTO contracts (contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency || 'USD', status || 'pending', terms]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms } = req.body;
    const result = await db.query(
      `UPDATE contracts SET contract_number=$1, customer_id=$2, carrier_id=$3, start_date=$4, end_date=$5, mode=$6, min_volume=$7, committed_rate=$8, currency=$9, status=$10, terms=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Contract deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Contract expiry monitor
router.get('/expiring', aiRateLimiter, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await db.query(
      `SELECT ct.*, c.company_name as customer_name, c.contact_name, c.email as customer_email,
              cr.name as carrier_name
       FROM contracts ct
       LEFT JOIN customers c ON ct.customer_id = c.id
       LEFT JOIN carriers cr ON ct.carrier_id = cr.id
       WHERE ct.end_date <= NOW() + INTERVAL '${days} days'
         AND ct.end_date >= NOW()
         AND ct.status != 'terminated'
       ORDER BY ct.end_date ASC`
    );

    if (result.rows.length === 0) return res.json({ data: [], total: 0, days_window: days });

    const withRecommendations = [];
    for (const contract of result.rows) {
      const systemPrompt = `You are a freight contract negotiation advisor. Analyze the contract and provide concise recommendations. Return JSON:
{
  "action": "renegotiate|extend_as_is|terminate",
  "rate_adjustment_pct": number (positive = increase, negative = decrease),
  "negotiation_points": ["point 1", "point 2", "point 3"],
  "reasoning": "brief 1-2 sentence justification"
}`;
      const userPrompt = `Contract expiring in ${Math.ceil((new Date(contract.end_date) - new Date()) / (1000*60*60*24))} days:
Customer: ${contract.customer_name || 'Unknown'}
Carrier: ${contract.carrier_name || 'Unknown'}
Mode: ${contract.mode || 'N/A'}
Committed rate: $${contract.committed_rate || 'N/A'} ${contract.currency || 'USD'}
Min volume: ${contract.min_volume || 'N/A'}
Status: ${contract.status}
Terms: ${contract.terms || 'standard'}`;

      let aiRecommendation;
      try {
        const aiResponse = await askAI(systemPrompt, userPrompt);
        const match = aiResponse.match(/\{[\s\S]*\}/);
        aiRecommendation = match ? JSON.parse(match[0]) : { action: 'renegotiate', reasoning: aiResponse };
      } catch {
        aiRecommendation = { action: 'renegotiate', reasoning: 'AI analysis unavailable' };
      }

      withRecommendations.push({
        ...contract,
        days_until_expiry: Math.ceil((new Date(contract.end_date) - new Date()) / (1000*60*60*24)),
        ai_recommendation: aiRecommendation,
      });
    }

    res.json({ data: withRecommendations, total: withRecommendations.length, days_window: days });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEW: Aggregate renewal alerts (single AI call summary) ──
router.post('/renewal-alerts', aiRateLimiter, async (req, res) => {
  try {
    const days = parseInt(req.body?.days) || 60;
    const r = await db.query(
      `SELECT ct.*, c.company_name as customer_name, cr.name as carrier_name
       FROM contracts ct
       LEFT JOIN customers c ON ct.customer_id = c.id
       LEFT JOIN carriers cr ON ct.carrier_id = cr.id
       WHERE ct.end_date <= NOW() + INTERVAL '${days} days' AND ct.end_date >= NOW() AND ct.status != 'terminated'
       ORDER BY ct.end_date ASC LIMIT 50`
    );

    if (r.rows.length === 0) return res.json({ summary: 'No contracts expiring soon.', alerts: [] });

    const systemPrompt = `You are a freight contract renewal advisor. Summarise the pending renewals and recommend price actions per contract. Return ONLY valid JSON: {summary, total_revenue_at_risk_usd, alerts: [{contract_id, customer_name, carrier_name, days_to_expiry, action (renegotiate|extend|terminate), recommended_rate_change_pct, justification, priority (immediate|high|medium|low)}]}.`;
    const aiResp = await askAI(systemPrompt, JSON.stringify(r.rows));
    const parsed = parseAIJson(aiResp);

    await persistAIResult({
      userId: req.user?.id, entityType: 'contract', entityId: null,
      analysisType: 'renewal-alerts', raw: aiResp, parsed
    });

    res.json({
      summary: parsed?.summary || aiResp,
      total_revenue_at_risk_usd: parsed?.total_revenue_at_risk_usd ?? null,
      alerts: parsed?.alerts || [],
      contracts_analysed: r.rows.length,
      days_window: days
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
