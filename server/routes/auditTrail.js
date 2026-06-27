const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search, entity_type, action } = req.query;
    let query = 'SELECT * FROM audit_trail WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (entity_type ILIKE $${params.length} OR user_name ILIKE $${params.length} OR field_changed ILIKE $${params.length})`; }
    if (entity_type) { params.push(entity_type); query += ` AND entity_type = $${params.length}`; }
    if (action) { params.push(action); query += ` AND action = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM audit_trail WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit entry not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['entity_type', 'entity_id', 'action', 'field_changed', 'old_value', 'new_value', 'user_name', 'ip_address'];
    const sets = [];
    const params = [];
    for (const col of allowed) {
      if (col in req.body) { params.push(req.body[col]); sets.push(`${col} = $${params.length}`); }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No editable fields provided' });
    params.push(req.params.id);
    const result = await db.query(`UPDATE audit_trail SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit entry not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM audit_trail WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit entry not found' });
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
