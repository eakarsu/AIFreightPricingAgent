const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { search, status, mode } = req.query;
    let query = `SELECT s.*, c.company_name as customer_name, cr.name as carrier_name
      FROM shipments s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN carriers cr ON s.carrier_id = cr.id WHERE 1=1`;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (s.tracking_number ILIKE $${params.length} OR s.origin ILIKE $${params.length} OR s.destination ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND s.status = $${params.length}`; }
    if (mode) { params.push(mode); query += ` AND s.mode = $${params.length}`; }
    query += ' ORDER BY s.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, c.company_name as customer_name, cr.name as carrier_name
       FROM shipments s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN carriers cr ON s.carrier_id = cr.id
       WHERE s.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status, quoted_price, actual_cost, pickup_date, delivery_date } = req.body;
    const result = await db.query(
      `INSERT INTO shipments (tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status, quoted_price, actual_cost, pickup_date, delivery_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status || 'booked', quoted_price, actual_cost, pickup_date, delivery_date]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('shipment', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status, quoted_price, actual_cost, pickup_date, delivery_date } = req.body;
    const result = await db.query(
      `UPDATE shipments SET tracking_number=$1, customer_id=$2, carrier_id=$3, route_id=$4, origin=$5, destination=$6, mode=$7, weight_kg=$8, volume_cbm=$9, status=$10, quoted_price=$11, actual_cost=$12, pickup_date=$13, delivery_date=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status, quoted_price, actual_cost, pickup_date, delivery_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('shipment', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM shipments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('shipment', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Shipment deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
