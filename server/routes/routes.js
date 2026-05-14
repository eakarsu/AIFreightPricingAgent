const router = require('express').Router();
const db = require('../db');
const { askAI } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.get('/', async (req, res) => {
  try {
    const { search, mode, congestion_level } = req.query;
    let query = 'SELECT * FROM routes WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (origin_city ILIKE $${params.length} OR destination_city ILIKE $${params.length})`; }
    if (mode) { params.push(mode); query += ` AND mode = $${params.length}`; }
    if (congestion_level) { params.push(congestion_level); query += ` AND congestion_level = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM routes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level, status } = req.body;
    const result = await db.query(
      `INSERT INTO routes (origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level, status || 'active']
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('route', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level, status } = req.body;
    const result = await db.query(
      `UPDATE routes SET origin_city=$1, origin_country=$2, destination_city=$3, destination_country=$4, mode=$5, distance_km=$6, transit_days_avg=$7, avg_rate_per_kg=$8, volume_last_30d=$9, congestion_level=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('route', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM routes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('route', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Route deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route congestion AI monitor — analyze high-congestion routes and suggest rerouting
router.post('/congestion-monitor', aiRateLimiter, async (req, res) => {
  try {
    const congestedRoutes = await db.query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM shipments s WHERE s.route_id = r.id) as shipment_count
       FROM routes r
       WHERE r.congestion_level IN ('high', 'severe', 'critical')
          OR r.congestion_level IS NOT NULL
       ORDER BY r.volume_last_30d DESC NULLS LAST
       LIMIT 20`
    );

    if (congestedRoutes.rows.length === 0) {
      return res.json({ message: 'No high-congestion routes found.', recommendations: [] });
    }

    const systemPrompt = `You are a freight route optimization specialist. Analyze congested freight routes and provide actionable rerouting and carrier swap recommendations. Return JSON:
{
  "overall_congestion_assessment": "<brief assessment>",
  "route_recommendations": [
    {
      "route": "<origin> → <destination>",
      "current_congestion": "<level>",
      "recommendation": "reroute|carrier_swap|accept_delay|split_shipment",
      "alternative_route": "<if reroute>",
      "alternative_carrier_mode": "<if carrier swap>",
      "estimated_savings_pct": <number>,
      "implementation_priority": "immediate|this_week|monitor"
    }
  ],
  "estimated_total_impact": "<summary of savings/impact>",
  "market_context": "<brief market context>"
}`;

    const userPrompt = `Analyze ${congestedRoutes.rows.length} congested freight routes:
${congestedRoutes.rows.map(r => `- ${r.origin_city} (${r.origin_country}) → ${r.destination_city} (${r.destination_country}): Mode=${r.mode}, Congestion=${r.congestion_level}, Avg Rate=$${r.avg_rate_per_kg}/kg, Transit=${r.transit_days_avg} days, Volume=${r.volume_last_30d || 0} units/30d, Active Shipments=${r.shipment_count}`).join('\n')}`;

    let aiAnalysis;
    try {
      const aiResponse = await askAI(systemPrompt, userPrompt);
      const match = aiResponse.match(/\{[\s\S]*\}/);
      aiAnalysis = match ? JSON.parse(match[0]) : { overall_congestion_assessment: aiResponse };
    } catch {
      aiAnalysis = { overall_congestion_assessment: 'AI analysis unavailable' };
    }

    res.json({
      routes_analyzed: congestedRoutes.rows.length,
      congested_routes: congestedRoutes.rows,
      ai_analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route analytics aggregation
router.get('/analytics', async (req, res) => {
  try {
    const [modeBreakdown, topRoutes, congestionSummary] = await Promise.all([
      db.query(`SELECT mode, COUNT(*) as route_count, AVG(avg_rate_per_kg) as avg_rate, AVG(transit_days_avg) as avg_transit FROM routes GROUP BY mode ORDER BY route_count DESC`),
      db.query(`SELECT r.*, COUNT(s.id) as shipment_count FROM routes r LEFT JOIN shipments s ON s.route_id = r.id GROUP BY r.id ORDER BY shipment_count DESC LIMIT 10`),
      db.query(`SELECT congestion_level, COUNT(*) as count FROM routes WHERE congestion_level IS NOT NULL GROUP BY congestion_level ORDER BY count DESC`)
    ]);

    res.json({
      mode_breakdown: modeBreakdown.rows,
      top_routes_by_shipments: topRoutes.rows,
      congestion_summary: congestionSummary.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
