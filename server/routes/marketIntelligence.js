const router = require('express').Router();
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { persistAIResult } = require('../services/aiResults');

router.get('/', async (req, res) => {
  try {
    const { search, report_type, severity } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (title ILIKE $${params.length} OR region ILIKE $${params.length})`; }
    if (report_type) { params.push(report_type); where += ` AND report_type = $${params.length}`; }
    if (severity) { params.push(severity); where += ` AND severity = $${params.length}`; }
    const dataParams = [...params, limit, offset];
    const dataQuery = `SELECT * FROM market_intelligence ${where} ORDER BY report_date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM market_intelligence ${where}`;
    const [data, count] = await Promise.all([db.query(dataQuery, dataParams), db.query(countQuery, params)]);
    const total = parseInt(count.rows[0].count);
    res.json({ data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM market_intelligence WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, region, mode, report_type, summary, ai_analysis, data_points, severity, report_date } = req.body;
    const result = await db.query(
      `INSERT INTO market_intelligence (title, region, mode, report_type, summary, ai_analysis, data_points, severity, report_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, region, mode, report_type, summary, ai_analysis, data_points ? JSON.stringify(data_points) : null, severity || 'info', report_date || new Date()]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('market_intelligence', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { region, mode, timeframe } = req.body;

    const systemPrompt = `You are a freight market intelligence analyst. Return ONLY valid JSON: {market_overview, rate_trends: [{period, change_pct, direction}], capacity_outlook, key_disruptions (array), forecast_30d, recommended_actions (array), severity (info|warn|critical), summary}.`;
    const userPrompt = JSON.stringify({ region: region || 'Global', mode: mode || 'All modes', timeframe: timeframe || 'Current quarter' });

    const aiResponse = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(aiResponse);

    await persistAIResult({
      userId: req.user?.id, entityType: 'market_intelligence', entityId: null,
      analysisType: 'analyze', raw: aiResponse, parsed
    });

    res.json({ ai_analysis: aiResponse, parsed, region, mode, timeframe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, region, mode, report_type, summary, ai_analysis, data_points, severity, report_date } = req.body;
    const result = await db.query(
      `UPDATE market_intelligence SET title=$1, region=$2, mode=$3, report_type=$4, summary=$5, ai_analysis=$6, data_points=$7, severity=$8, report_date=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, region, mode, report_type, summary, ai_analysis, data_points ? JSON.stringify(data_points) : null, severity, report_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('market_intelligence', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM market_intelligence WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('market_intelligence', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Report deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
