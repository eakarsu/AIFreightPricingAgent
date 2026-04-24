const router = require('express').Router();
const db = require('../db');
const { askAI } = require('../services/openrouter');

router.get('/', async (req, res) => {
  try {
    const { search, report_type, severity } = req.query;
    let query = 'SELECT * FROM market_intelligence WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (title ILIKE $${params.length} OR region ILIKE $${params.length})`; }
    if (report_type) { params.push(report_type); query += ` AND report_type = $${params.length}`; }
    if (severity) { params.push(severity); query += ` AND severity = $${params.length}`; }
    query += ' ORDER BY report_date DESC, created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
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

router.post('/analyze', async (req, res) => {
  try {
    const { region, mode, timeframe } = req.body;

    const systemPrompt = `You are a freight market intelligence analyst for a global logistics platform. Provide comprehensive, data-driven market analysis. Structure your response with clear sections:

**Market Overview**: Current state of the market
**Rate Trends**: Recent price movements with specific percentages
**Capacity Outlook**: Supply and demand dynamics
**Key Disruptions**: Events impacting the market
**30-Day Forecast**: Expected trends
**Recommended Actions**: Specific actionable recommendations

Use specific numbers, percentages, and data points to make the analysis concrete and actionable.`;

    const userPrompt = `Analyze the freight market for:
- Region: ${region || 'Global'}
- Transport Mode: ${mode || 'All modes'}
- Timeframe: ${timeframe || 'Current quarter'}

Provide a detailed market intelligence report.`;

    const aiResponse = await askAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: aiResponse, region, mode, timeframe });
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
