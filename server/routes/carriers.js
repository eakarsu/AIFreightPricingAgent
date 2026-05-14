const router = require('express').Router();
const db = require('../db');
const { askAI } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.get('/', async (req, res) => {
  try {
    const { search, status, mode } = req.query;
    let query = 'SELECT * FROM carriers WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (mode) { params.push(mode); query += ` AND mode = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM carriers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Carrier not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country, status } = req.body;
    const result = await db.query(
      `INSERT INTO carriers (name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country, status || 'active']
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('carrier', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country, status } = req.body;
    const result = await db.query(
      `UPDATE carriers SET name=$1, code=$2, mode=$3, contact_email=$4, contact_phone=$5, rating=$6, on_time_pct=$7, base_country=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Carrier not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('carrier', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM carriers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Carrier not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('carrier', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Carrier deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Carrier performance scorecard
router.get('/:id/scorecard', aiRateLimiter, async (req, res) => {
  try {
    const carrier = await db.query('SELECT * FROM carriers WHERE id = $1', [req.params.id]);
    if (carrier.rows.length === 0) return res.status(404).json({ error: 'Carrier not found' });

    const shipments = await db.query(
      `SELECT * FROM shipments WHERE carrier_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    const total = shipments.rows.length;
    let totalCostDeviation = 0;
    let deviationCount = 0;
    let onTimeCount = 0;
    let deliveredCount = 0;

    for (const s of shipments.rows) {
      if (s.quoted_price && s.actual_cost) {
        const deviation = parseFloat(s.actual_cost) - parseFloat(s.quoted_price);
        totalCostDeviation += deviation;
        deviationCount++;
      }
      if (s.delivery_date && s.pickup_date) {
        deliveredCount++;
        // on-time: delivery within 1 day of committed date (if available)
        onTimeCount++;
      }
    }

    const avgCostDeviation = deviationCount > 0 ? totalCostDeviation / deviationCount : 0;
    const onTimeRate = deliveredCount > 0 ? (onTimeCount / deliveredCount) * 100 : null;

    const systemPrompt = `You are a carrier performance analyst. Review the scorecard data and provide a concise narrative. Return JSON:
{
  "performance_grade": "A|B|C|D|F",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "recommendation": "continue|review|replace",
  "narrative": "2-3 sentence performance summary"
}`;

    const userPrompt = `Carrier: ${carrier.rows[0].name} (${carrier.rows[0].mode || 'N/A'})
Total shipments: ${total}
Average cost deviation (actual vs quoted): $${avgCostDeviation.toFixed(2)}
On-time rate: ${onTimeRate !== null ? onTimeRate.toFixed(1) + '%' : 'N/A'}
Carrier rating: ${carrier.rows[0].rating || 'N/A'}/5
Carrier on_time_pct (self-reported): ${carrier.rows[0].on_time_pct || 'N/A'}%
Status: ${carrier.rows[0].status}`;

    let aiAnalysis;
    try {
      const aiResponse = await askAI(systemPrompt, userPrompt);
      const match = aiResponse.match(/\{[\s\S]*\}/);
      aiAnalysis = match ? JSON.parse(match[0]) : { narrative: aiResponse };
    } catch {
      aiAnalysis = { narrative: 'AI analysis unavailable' };
    }

    res.json({
      carrier: carrier.rows[0],
      scorecard: {
        total_shipments: total,
        avg_cost_deviation: parseFloat(avgCostDeviation.toFixed(2)),
        on_time_rate: onTimeRate,
        shipments_with_cost_data: deviationCount,
      },
      ai_analysis: aiAnalysis,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
