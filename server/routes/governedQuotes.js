const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { calculateQuote, validateTransition } = require('../domain/quoteWorkflow');
const tenant = (req) => String(req.user.organization_id || req.user.tenant_id || `personal-${req.user.id}`);

router.get('/', async (req, res, next) => {
  try { const result = await db.query('SELECT * FROM governed_quotes WHERE tenant_id=$1 ORDER BY created_at DESC', [tenant(req)]); res.json(result.rows); } catch (error) { next(error); }
});

router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const key = req.get('idempotency-key'); if (!key) throw new Error('Idempotency-Key header is required');
    for (const field of ['shipment_reference','origin','destination','mode','weight','weight_unit','distance','distance_unit','currency']) if (!req.body[field]) throw new Error(`${field} is required`);
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO governed_quotes(tenant_id,shipment_reference,origin,destination,mode,weight,weight_unit,distance,distance_unit,currency,inputs,idempotency_key,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
      [tenant(req), req.body.shipment_reference, req.body.origin, req.body.destination, req.body.mode, Number(req.body.weight), req.body.weight_unit, Number(req.body.distance), req.body.distance_unit, req.body.currency.toUpperCase(), req.body, key, req.user.id]
    );
    await client.query('INSERT INTO freight_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_state,request_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [tenant(req), req.user.id, 'quote.created', 'quote', String(result.rows[0].id), result.rows[0], req.get('x-request-id') || crypto.randomUUID()]);
    await client.query('COMMIT'); res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(400).json({ error: error.message }); } finally { client.release(); }
});

router.post('/:id/cost', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM governed_quotes WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
    const quote = found.rows[0]; if (!quote) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'quote not found' }); }
    if (quote.status !== 'draft') throw new Error('only draft quotes may be costed');
    const calculated = calculateQuote({ ...req.body, distance: quote.distance });
    const result = await client.query(`UPDATE governed_quotes SET cost_amount=$1,price_amount=$2,margin_percent=$3,rate_valid_until=$4,evidence=$5,status='costed',version=version+1,updated_at=NOW() WHERE id=$6 AND tenant_id=$7 AND version=$8 RETURNING *`, [calculated.cost, calculated.price, req.body.margin_percent, req.body.rate_valid_until, JSON.stringify(req.body.evidence || []), quote.id, tenant(req), Number(req.body.version)]);
    if (!result.rows[0]) throw new Error('version conflict');
    await client.query('INSERT INTO freight_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_state,after_state,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [tenant(req), req.user.id, 'quote.costed', 'quote', String(quote.id), quote, result.rows[0], req.get('x-request-id') || crypto.randomUUID()]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(409).json({ error: error.message }); } finally { client.release(); }
});

router.post('/:id/transition', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM governed_quotes WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
    const quote = found.rows[0]; if (!quote) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'quote not found' }); }
    validateTransition(quote.status, req.body.status, { role: req.user.role, rateValidUntil: quote.rate_valid_until, evidenceCount: quote.evidence?.length || 0 });
    const result = await client.query(`UPDATE governed_quotes SET status=$1,approved_by=CASE WHEN $1='approved' THEN $2 ELSE approved_by END,version=version+1,updated_at=NOW() WHERE id=$3 AND tenant_id=$4 AND version=$5 RETURNING *`, [req.body.status, req.user.id, quote.id, tenant(req), Number(req.body.version)]);
    if (!result.rows[0]) throw new Error('version conflict');
    await client.query('INSERT INTO freight_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_state,after_state,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [tenant(req), req.user.id, 'quote.transitioned', 'quote', String(quote.id), quote, result.rows[0], req.get('x-request-id') || crypto.randomUUID()]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(409).json({ error: error.message }); } finally { client.release(); }
});

router.post('/:id/overrides', async (req, res, next) => {
  try {
    if (!['pricing_manager','admin'].includes(req.user.role)) return res.status(403).json({ error: 'pricing manager required' });
    if (!req.body.field_name || !req.body.reason) return res.status(400).json({ error: 'field_name and reason required' });
    const result = await db.query(`INSERT INTO quote_overrides(tenant_id,quote_id,actor_user_id,field_name,old_value,new_value,reason,approved_by) SELECT $1,id,$2,$3,$4,$5,$6,$2 FROM governed_quotes WHERE id=$7 AND tenant_id=$1 RETURNING *`, [tenant(req), req.user.id, req.body.field_name, req.body.old_value || null, req.body.new_value || null, req.body.reason, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'quote not found' }); res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/integration-runs', async (req, res, next) => {
  try {
    if (!req.body.provider || !['running','succeeded','failed','stale'].includes(req.body.status)) return res.status(400).json({ error: 'provider and valid status required' });
    if (req.body.status === 'failed' && !req.body.error_code) return res.status(400).json({ error: 'error_code required' });
    const result = await db.query('INSERT INTO freight_integration_runs(tenant_id,provider,data_as_of,status,error_code,error_message) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [tenant(req), req.body.provider, req.body.data_as_of || null, req.body.status, req.body.error_code || null, req.body.error_message || null]); res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});
module.exports = router;
