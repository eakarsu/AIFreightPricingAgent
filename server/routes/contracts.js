const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT ct.*, c.company_name as customer_name, cr.name as carrier_name
      FROM contracts ct
      LEFT JOIN customers c ON ct.customer_id = c.id
      LEFT JOIN carriers cr ON ct.carrier_id = cr.id WHERE 1=1`;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (ct.contract_number ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND ct.status = $${params.length}`; }
    query += ' ORDER BY ct.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ct.*, c.company_name as customer_name, cr.name as carrier_name
       FROM contracts ct LEFT JOIN customers c ON ct.customer_id = c.id LEFT JOIN carriers cr ON ct.carrier_id = cr.id
       WHERE ct.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms } = req.body;
    const result = await db.query(
      `INSERT INTO contracts (contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency || 'USD', status || 'pending', terms]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms } = req.body;
    const result = await db.query(
      `UPDATE contracts SET contract_number=$1, customer_id=$2, carrier_id=$3, start_date=$4, end_date=$5, mode=$6, min_volume=$7, committed_rate=$8, currency=$9, status=$10, terms=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('contract', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Contract deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
