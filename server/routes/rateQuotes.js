const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { askAI, askAIWithTools, parseAIJson } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { persistAIResult } = require('../services/aiResults');

// ── List (with pagination + filters) ──
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (rq.quote_number ILIKE $${params.length} OR rq.origin ILIKE $${params.length} OR rq.destination ILIKE $${params.length})`; }
    if (status) { params.push(status); where += ` AND rq.status = $${params.length}`; }

    const dataParams = [...params, limit, offset];
    const dataQuery = `SELECT rq.*, c.company_name as customer_name FROM rate_quotes rq LEFT JOIN customers c ON rq.customer_id = c.id ${where} ORDER BY rq.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM rate_quotes rq ${where}`;
    const [data, count] = await Promise.all([db.query(dataQuery, dataParams), db.query(countQuery, params)]);
    const total = parseInt(count.rows[0].count);
    res.json({ data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rq.*, c.company_name as customer_name FROM rate_quotes rq LEFT JOIN customers c ON rq.customer_id = c.id WHERE rq.id = $1`,
      [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status, valid_until, ai_reasoning } = req.body;
    if (!origin || !destination || !mode) return res.status(400).json({ error: 'origin, destination, and mode are required' });
    const result = await db.query(
      `INSERT INTO rate_quotes (quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status, valid_until, ai_reasoning)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status || 'draft', valid_until, ai_reasoning]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('rate_quote', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI: Generate (single rate, JSON-structured) ──
router.post('/generate', aiRateLimiter, async (req, res) => {
  try {
    const { origin, destination, mode, weight_kg, volume_cbm, customer_id } = req.body;
    if (!origin || !destination || !mode) return res.status(400).json({ error: 'origin, destination, and mode are required' });

    let customer = null;
    if (customer_id) {
      const cust = await db.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
      customer = cust.rows[0] || null;
    }

    // Pull lane history for elasticity priors
    const elasticity = await db.query(
      'SELECT * FROM lane_elasticity WHERE origin = $1 AND destination = $2 AND mode = $3',
      [origin, destination, mode]
    ).catch(() => ({ rows: [] }));

    const spotRates = await db.query(
      'SELECT * FROM spot_rates WHERE origin = $1 AND destination = $2 AND mode = $3 ORDER BY recorded_at DESC LIMIT 5',
      [origin, destination, mode]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = `You are a freight pricing analyst. Given shipment details and lane history, return ONLY valid JSON: {recommended_rate_usd (number, no commas), confidence_score (0-100), key_pricing_factors (array), market_comparison, risk_assessment, recommendation_summary, win_probability_pct (0-100), expected_margin_pct}.`;
    const userPrompt = JSON.stringify({
      origin, destination, mode, weight_kg, volume_cbm,
      customer: customer ? { tier: customer.tier, industry: customer.industry, name: customer.company_name } : null,
      lane_elasticity: elasticity.rows[0] || null,
      recent_spot_rates: spotRates.rows
    });

    const aiResponse = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(aiResponse);
    const suggestedRate = parsed?.recommended_rate_usd ?? null;

    await persistAIResult({
      userId: req.user?.id,
      entityType: 'rate_quote', entityId: null,
      analysisType: 'generate', raw: aiResponse, parsed
    });

    res.json({
      ai_reasoning: aiResponse,
      ai_suggested_rate: suggestedRate,
      parsed,
      origin, destination, mode, weight_kg, volume_cbm
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEW: Tool-calling pricing agent ──
const PRICING_TOOLS = [
  { type: 'function', function: { name: 'lookup_carrier_rates',
    description: 'Look up carrier base rates for a lane.',
    parameters: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, mode: { type: 'string' } }, required: ['origin', 'destination', 'mode'] } } },
  { type: 'function', function: { name: 'check_fuel_surcharge',
    description: 'Get current fuel surcharge percentage for a region.',
    parameters: { type: 'object', properties: { region: { type: 'string' } } } } },
  { type: 'function', function: { name: 'query_lane_history',
    description: 'Get historical accept/decline data and elasticity for a lane.',
    parameters: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, mode: { type: 'string' } }, required: ['origin','destination','mode'] } } },
  { type: 'function', function: { name: 'query_spot_rates',
    description: 'Get most recent spot rates for a lane.',
    parameters: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, mode: { type: 'string' } } } } },
];

const TOOL_REG = {
  lookup_carrier_rates: async ({ origin, destination, mode }) => {
    const r = await db.query(
      `SELECT id, name, base_rate_per_km, mode FROM carriers WHERE mode = $1 LIMIT 5`, [mode]
    ).catch(() => ({ rows: [] }));
    return { lane: { origin, destination, mode }, carriers: r.rows };
  },
  check_fuel_surcharge: async ({ region }) => {
    return { region: region || 'US', fuel_surcharge_pct: 14.5, source: 'EIA-weekly-fixture' };
  },
  query_lane_history: async ({ origin, destination, mode }) => {
    const r = await db.query(
      `SELECT * FROM lane_elasticity WHERE origin = $1 AND destination = $2 AND mode = $3`,
      [origin, destination, mode]
    ).catch(() => ({ rows: [] }));
    return r.rows[0] || { lane: { origin, destination, mode }, note: 'No history' };
  },
  query_spot_rates: async ({ origin, destination, mode }) => {
    const r = await db.query(
      `SELECT * FROM spot_rates WHERE origin = $1 AND destination = $2 AND mode = $3 ORDER BY recorded_at DESC LIMIT 5`,
      [origin || '', destination || '', mode || '']
    ).catch(() => ({ rows: [] }));
    return r.rows;
  }
};

router.post('/agent-quote', aiRateLimiter, async (req, res) => {
  try {
    const { origin, destination, mode, weight_kg, volume_cbm, customer_id } = req.body;
    if (!origin || !destination || !mode) return res.status(400).json({ error: 'origin, destination, mode required' });

    const SYSTEM = `You are a freight pricing AI agent with tools. Use lookup_carrier_rates, check_fuel_surcharge, query_lane_history, query_spot_rates as needed. After gathering data, return ONLY valid JSON: {recommended_rate_usd, confidence_score (0-100), supporting_evidence (array of strings), win_probability_pct, expected_margin_pct, summary}.`;
    let messages = [{ role: 'user', content: JSON.stringify({ origin, destination, mode, weight_kg, volume_cbm, customer_id }) }];

    let final = null;
    for (let round = 0; round < 4; round++) {
      const msg = await askAIWithTools(SYSTEM, messages, PRICING_TOOLS);
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
        for (const tc of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch (_) {}
          const result = TOOL_REG[tc.function.name] ? await TOOL_REG[tc.function.name](args) : { error: 'unknown tool' };
          messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result).slice(0, 8000) });
        }
      } else {
        final = msg.content;
        break;
      }
    }

    const parsed = parseAIJson(final);
    await persistAIResult({
      userId: req.user?.id,
      entityType: 'rate_quote', entityId: null,
      analysisType: 'agent-quote', raw: final, parsed
    });

    res.json({
      raw: final,
      parsed,
      ai_suggested_rate: parsed?.recommended_rate_usd ?? null,
      win_probability_pct: parsed?.win_probability_pct ?? null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status, valid_until, ai_reasoning } = req.body;
    const result = await db.query(
      `UPDATE rate_quotes SET quote_number=$1, customer_id=$2, origin=$3, destination=$4, mode=$5, weight_kg=$6, volume_cbm=$7, base_rate=$8, ai_suggested_rate=$9, final_rate=$10, margin_pct=$11, status=$12, valid_until=$13, ai_reasoning=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status, valid_until, ai_reasoning, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('rate_quote', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM rate_quotes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('rate_quote', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Quote deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/apply-rules', async (req, res) => {
  try {
    const { quote_id } = req.body;
    if (!quote_id) return res.status(400).json({ error: 'quote_id is required' });

    const quoteResult = await db.query('SELECT * FROM rate_quotes WHERE id = $1', [quote_id]);
    if (quoteResult.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });

    const quote = quoteResult.rows[0];
    const rulesResult = await db.query('SELECT * FROM pricing_rules WHERE is_active = true ORDER BY priority DESC');

    let adjustedRate = parseFloat(quote.ai_suggested_rate || quote.base_rate || 0);
    const appliedRules = [];

    for (const rule of rulesResult.rows) {
      const fieldValue = quote[rule.condition_field];
      if (fieldValue === undefined || fieldValue === null) continue;

      const numVal = parseFloat(fieldValue);
      const condVal = parseFloat(rule.condition_value);
      let conditionMet = false;
      switch (rule.condition_operator) {
        case '>': conditionMet = numVal > condVal; break;
        case '<': conditionMet = numVal < condVal; break;
        case '>=': conditionMet = numVal >= condVal; break;
        case '<=': conditionMet = numVal <= condVal; break;
        case '=':
        case '==': conditionMet = String(fieldValue) === String(rule.condition_value); break;
      }
      if (!conditionMet) continue;

      const adjustment = rule.adjustment_type === 'percentage'
        ? adjustedRate * (parseFloat(rule.adjustment_value) / 100)
        : parseFloat(rule.adjustment_value);
      if (rule.rule_type === 'surcharge') { adjustedRate += adjustment; appliedRules.push({ rule: rule.name, type: 'surcharge', amount: adjustment }); }
      else if (rule.rule_type === 'discount') { adjustedRate -= adjustment; appliedRules.push({ rule: rule.name, type: 'discount', amount: adjustment }); }
    }

    adjustedRate = Math.max(0, adjustedRate);
    await db.query('UPDATE rate_quotes SET final_rate = $1, updated_at = NOW() WHERE id = $2', [adjustedRate, quote_id]);
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('rate_quote', $1, 'apply_rules', $2)`,
      [quote_id, req.user?.name || 'system']);

    res.json({ quote_id, original_rate: parseFloat(quote.ai_suggested_rate || quote.base_rate || 0), final_rate: adjustedRate, rules_applied: appliedRules, rules_evaluated: rulesResult.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', aiRateLimiter, async (req, res) => {
  try {
    const { quotes } = req.body;
    if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
      return res.status(400).json({ error: 'quotes array is required' });
    }
    if (quotes.length > 10) return res.status(400).json({ error: 'Maximum 10 quotes per batch' });

    const results = [];
    for (const q of quotes) {
      const { origin_city, destination_city, mode, weight } = q;
      if (!origin_city || !destination_city || !mode) {
        results.push({ ...q, error: 'origin_city, destination_city, mode required', ai_suggested_rate: null });
        continue;
      }
      try {
        const systemPrompt = `Return ONLY valid JSON: {recommended_rate_usd (number), confidence (0-100), notes}.`;
        const userPrompt = JSON.stringify({ origin: origin_city, destination: destination_city, mode, weight_kg: weight });
        const aiResponse = await askAI(systemPrompt, userPrompt);
        const parsed = parseAIJson(aiResponse);
        results.push({ origin_city, destination_city, mode, weight: weight || null,
          ai_suggested_rate: parsed?.recommended_rate_usd ?? null, ai_reasoning: aiResponse });
      } catch (aiErr) {
        results.push({ ...q, error: aiErr.message, ai_suggested_rate: null });
      }
    }

    const csvRows = [
      ['origin_city', 'destination_city', 'mode', 'weight_kg', 'ai_suggested_rate_usd', 'notes'],
      ...results.map(r => [r.origin_city || '', r.destination_city || '', r.mode || '', r.weight || '', r.ai_suggested_rate || '', r.error || 'AI generated'])
    ];
    const csv = csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvBase64 = Buffer.from(csv).toString('base64');
    res.json({ quotes: results, total: results.length, csv_download: { filename: 'spot-quotes.csv', content_type: 'text/csv', data_base64: csvBase64 } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEW: Lane elasticity recompute (logistic-style coefficient) ──
router.post('/recompute-elasticity', async (req, res) => {
  try {
    // Aggregate accept/decline stats from rate_quotes
    const rows = await db.query(`
      SELECT origin, destination, mode,
        COUNT(*)::int AS total_quotes,
        SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END)::int AS accepted_quotes,
        AVG(CASE WHEN status='accepted' THEN final_rate END) AS avg_accept_price,
        AVG(CASE WHEN status IN ('declined','rejected') THEN final_rate END) AS avg_decline_price
      FROM rate_quotes
      WHERE origin IS NOT NULL AND destination IS NOT NULL AND mode IS NOT NULL
      GROUP BY origin, destination, mode
    `);

    let upserted = 0;
    for (const r of rows.rows) {
      // Naive elasticity coefficient: (acceptRate / 0.5) - 1, scaled by avg_decline / avg_accept
      const acceptRate = r.total_quotes > 0 ? r.accepted_quotes / r.total_quotes : 0;
      let coeff = acceptRate - 0.5;
      if (r.avg_decline_price && r.avg_accept_price) {
        coeff *= (parseFloat(r.avg_decline_price) / parseFloat(r.avg_accept_price));
      }

      await db.query(`
        INSERT INTO lane_elasticity (origin, destination, mode, total_quotes, accepted_quotes, avg_accept_price, avg_decline_price, coefficient, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (origin, destination, mode) DO UPDATE SET
          total_quotes=EXCLUDED.total_quotes, accepted_quotes=EXCLUDED.accepted_quotes,
          avg_accept_price=EXCLUDED.avg_accept_price, avg_decline_price=EXCLUDED.avg_decline_price,
          coefficient=EXCLUDED.coefficient, updated_at=NOW()
      `, [r.origin, r.destination, r.mode, r.total_quotes, r.accepted_quotes, r.avg_accept_price, r.avg_decline_price, coeff]);
      upserted++;
    }
    res.json({ lanes_updated: upserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEW: Customer-portal explain link (token + AI justification) ──
router.post('/:id/share', aiRateLimiter, async (req, res) => {
  try {
    const r = await db.query('SELECT rq.*, c.company_name as customer_name, c.tier FROM rate_quotes rq LEFT JOIN customers c ON rq.customer_id = c.id WHERE rq.id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const quote = r.rows[0];

    const systemPrompt = `You are a customer-facing freight pricing analyst. Write a clear, courteous justification for this rate (3-5 paragraphs, markdown). Highlight customer tier, lane factors, fuel/seasonality, and value-adds. Do NOT mention internal margins.`;
    const justification = await askAI(systemPrompt, JSON.stringify(quote));

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await db.query(
      `INSERT INTO quote_share_tokens (quote_id, token, ai_justification, created_by, expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [quote.id, token, justification, req.user?.name || 'system', expires]
    );

    await persistAIResult({
      userId: req.user?.id,
      entityType: 'rate_quote', entityId: quote.id,
      analysisType: 'share-justification', raw: justification, parsed: null
    });

    res.json({
      share_url: `/portal/quote/${token}`,
      token,
      expires_at: expires.toISOString(),
      ai_justification_preview: justification.slice(0, 240) + '...'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
