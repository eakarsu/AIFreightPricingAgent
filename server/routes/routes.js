const router = require('express').Router();
const db = require('../db');

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

module.exports = router;
