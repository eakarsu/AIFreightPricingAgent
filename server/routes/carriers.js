const router = require('express').Router();
const db = require('../db');

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

module.exports = router;
