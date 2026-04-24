const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search, rule_type, is_active } = req.query;
    let query = 'SELECT * FROM pricing_rules WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND name ILIKE $${params.length}`; }
    if (rule_type) { params.push(rule_type); query += ` AND rule_type = $${params.length}`; }
    if (is_active !== undefined) { params.push(is_active === 'true'); query += ` AND is_active = $${params.length}`; }
    query += ' ORDER BY priority DESC, created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM pricing_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority, is_active } = req.body;
    const result = await db.query(
      `INSERT INTO pricing_rules (name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority || 0, is_active !== false]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('pricing_rule', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority, is_active } = req.body;
    const result = await db.query(
      `UPDATE pricing_rules SET name=$1, rule_type=$2, mode=$3, condition_field=$4, condition_operator=$5, condition_value=$6, adjustment_type=$7, adjustment_value=$8, priority=$9, is_active=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('pricing_rule', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM pricing_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('pricing_rule', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Rule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
