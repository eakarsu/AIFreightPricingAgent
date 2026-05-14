const router = require('express').Router();
const db = require('../db');

// ── Public: Customer-portal share-token endpoint (no auth) ──
router.get('/quote/:token', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT t.*, rq.* FROM quote_share_tokens t
       JOIN rate_quotes rq ON rq.id = t.quote_id
       WHERE t.token = $1`, [req.params.token]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired share link' });
    const row = r.rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link expired' });
    }
    // Hide internal-only fields
    res.json({
      quote_number: row.quote_number,
      origin: row.origin,
      destination: row.destination,
      mode: row.mode,
      weight_kg: row.weight_kg,
      volume_cbm: row.volume_cbm,
      final_rate: row.final_rate,
      ai_suggested_rate: row.ai_suggested_rate,
      ai_justification: row.ai_justification,
      valid_until: row.valid_until,
      shared_at: row.created_at
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
