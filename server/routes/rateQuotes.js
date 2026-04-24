const router = require('express').Router();
const db = require('../db');
const { askAI } = require('../services/openrouter');

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT rq.*, c.company_name as customer_name FROM rate_quotes rq LEFT JOIN customers c ON rq.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (rq.quote_number ILIKE $${params.length} OR rq.origin ILIKE $${params.length} OR rq.destination ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND rq.status = $${params.length}`; }
    query += ' ORDER BY rq.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
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

router.post('/generate', async (req, res) => {
  try {
    const { origin, destination, mode, weight_kg, volume_cbm, customer_id } = req.body;

    let customerInfo = '';
    if (customer_id) {
      const cust = await db.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
      if (cust.rows[0]) customerInfo = `Customer: ${cust.rows[0].company_name} (${cust.rows[0].tier} tier, ${cust.rows[0].industry} industry)`;
    }

    const systemPrompt = `You are a freight pricing analyst for a $4T logistics platform. Given shipment details, provide a comprehensive pricing analysis. Structure your response with these sections:

**Recommended Rate**: Provide a specific USD amount
**Confidence Score**: 0-100
**Key Pricing Factors**:
- List each factor with explanation
**Market Comparison**: Compare to current market rates
**Risk Assessment**: Note any risks or volatility factors
**Recommendation**: Final recommendation summary`;

    const userPrompt = `Generate a dynamic freight price quote:
- Origin: ${origin}
- Destination: ${destination}
- Mode: ${mode}
- Weight: ${weight_kg} kg
- Volume: ${volume_cbm} CBM
${customerInfo}

Consider fuel surcharges, seasonal demand, route congestion, and capacity availability.`;

    const aiResponse = await askAI(systemPrompt, userPrompt);

    const rateMatch = aiResponse.match(/\$[\d,]+(?:\.\d{2})?/);
    const suggestedRate = rateMatch ? parseFloat(rateMatch[0].replace(/[$,]/g, '')) : null;

    res.json({
      ai_reasoning: aiResponse,
      ai_suggested_rate: suggestedRate,
      origin,
      destination,
      mode,
      weight_kg,
      volume_cbm
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

module.exports = router;
