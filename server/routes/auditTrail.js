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

module.exports = router;
