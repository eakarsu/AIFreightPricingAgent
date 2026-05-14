// Vision-based damage assessment accepting photos to estimate repair cost
// and initiate claims.
// Audit: batch_04.md / AIFreightPricingAgent / Custom Feature Suggestions #6
const express = require('express');
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');

const router = express.Router();

// POST /api/damage-vision/assess
// Body: { shipment_id, image_urls: [..], damage_type? }
router.post('/assess', async (req, res) => {
  try {
    const { shipment_id, image_urls = [], damage_type, description } = req.body || {};
    if (!shipment_id || !Array.isArray(image_urls) || image_urls.length === 0) {
      return res.status(400).json({ error: 'shipment_id and at least one image_url required' });
    }

    let shipment = null;
    try {
      const r = await db.query(`SELECT * FROM shipments WHERE id = $1`, [shipment_id]);
      shipment = r.rows[0] || null;
    } catch (_) {}

    const systemPrompt = `You are a freight cargo damage vision assessor. Given image URLs and shipment metadata,
estimate severity, repair cost, claim category, and salvage value. If you cannot directly view the images,
produce a structured assessment template ready for human inspector follow-up. Return STRICT JSON only.`;

    const userPrompt = `Shipment: ${shipment ? JSON.stringify({ id: shipment.id, origin: shipment.origin, destination: shipment.destination, commodity: shipment.commodity, value_usd: shipment.value_usd }) : shipment_id}
Damage type hint: ${damage_type || 'unspecified'}
Notes from driver/consignee: ${description || 'none'}
Image URLs (${image_urls.length}):
${image_urls.slice(0, 10).join('\n')}

Return JSON:
{
  "summary": "...",
  "severity": "minor|moderate|major|total_loss",
  "estimated_repair_cost_usd": 0,
  "estimated_salvage_value_usd": 0,
  "claim_category": "concealed|visible|shortage|temperature|wet|crushed|other",
  "recommended_action": "repair|repackage|salvage|total_loss",
  "evidence_checklist": ["..."],
  "claim_initiation_payload": {
    "carrier_notification_template": "string",
    "consignee_notice_template": "string",
    "required_documents": ["..."]
  },
  "disclaimer": "AI-assisted estimate; final claim value requires inspector validation."
}`;

    const raw = await askAI(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { notes: raw };

    try {
      await db.query(
        `INSERT INTO audit_trail (user_id, action, resource, resource_id, details, created_at)
         VALUES ($1, 'damage_vision_assess', 'shipments', $2, $3, NOW())`,
        [req.user?.id || null, String(shipment_id),
         JSON.stringify({ severity: parsed.severity, image_count: image_urls.length })]
      ).catch(() => {});
    } catch (_) {}

    res.json({ shipment_id, image_count: image_urls.length, assessment: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/damage-vision/recent
router.get('/recent', async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT id, resource_id, details, created_at FROM audit_trail
       WHERE action = 'damage_vision_assess' ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
