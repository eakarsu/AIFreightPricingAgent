// Apply pass 5 — backlog implementations.
//
// All routes here are additive. Tables use CREATE TABLE IF NOT EXISTS.
// External-data integrations return 503 with `missing: <ENV>` when the
// required credential is unset.
//
// Documented env vars:
//   DAT_API_KEY                    — DAT spot rate feed
//   TRUCKSTOP_API_KEY              — Truckstop spot rate feed
//   DOE_FUEL_API_KEY               — U.S. Energy Information Administration fuel index
//   FMCSA_API_KEY                  — FMCSA carrier safety scorecards
//   CARBON_API_KEY                 — emissions data provider (e.g. Climatiq)
//   STRIPE_SECRET_KEY              — billing
//   STRIPE_PRICE_ID_INVOICE        — default invoice line item
//   SENDGRID_API_KEY               — outbound notifications
//   SENDGRID_FROM_EMAIL            — sender address
//   OPENROUTER_API_KEY             — gates the agentic spot-trader, multimodal optimizer,
//                                    and damage-vision endpoints (already used elsewhere).
//
// PRODUCT-DECISION defaults:
//   - Billing: a "draft invoice" model (`bp5_invoices`) — Stripe is invoked only
//     when STRIPE_SECRET_KEY is set; otherwise we record the line items locally.
//   - Notifications: `bp5_notifications` log-only by default. SendGrid send
//     is attempted iff SENDGRID_API_KEY is set.
//   - Agentic spot trader: NEVER auto-books carriers. It returns a *recommendation*
//     with `auto_book: false` hard-coded.
//   - Multimodal optimizer: produces options ranked by cost/transit/risk; no
//     bin-packing or LP solver — heuristic only.
//   - Vision damage: "NOT a settlement determination" disclaimer; heuristic
//     stub returns severity hints.

const router = require('express').Router();
const db = require('../db');
const { askAI, parseAIJson } = require('../services/openrouter');
const { persistAIResult } = require('../services/aiResults');

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bp5_external_calls (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50),
      action VARCHAR(50),
      status_code INT,
      missing_env TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS bp5_invoices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      customer_email TEXT,
      line_items JSONB,
      total_usd NUMERIC(12,2),
      status VARCHAR(20) DEFAULT 'draft',
      stripe_invoice_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS bp5_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      channel VARCHAR(20),
      to_addr TEXT,
      subject TEXT,
      body TEXT,
      status VARCHAR(20) DEFAULT 'queued',
      provider_response TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS bp5_agent_runs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      kind VARCHAR(40),
      input JSONB,
      output JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureTables();

function logExt(provider, action, code, missing) {
  db.query(
    `INSERT INTO bp5_external_calls (provider, action, status_code, missing_env) VALUES ($1,$2,$3,$4)`,
    [provider, action, code, missing || null]
  ).catch(() => {});
}

function require503(envName) {
  return { error: `${envName} not configured`, missing: envName };
}

// ────────────────────────────────────────────────────────────────────────────
// External data feeds (NEEDS-CREDS)
// ────────────────────────────────────────────────────────────────────────────
router.get('/integrations/dat/spot-rate', async (req, res) => {
  if (!process.env.DAT_API_KEY) {
    logExt('dat', 'spot-rate', 503, 'DAT_API_KEY');
    return res.status(503).json(require503('DAT_API_KEY'));
  }
  // Real call would go to DAT API; we don't have an API contract finalized.
  // Mark as un-implemented but key-present.
  res.status(501).json({ error: 'DAT integration scaffolded; provider call not yet wired.' });
});

router.get('/integrations/truckstop/spot-rate', async (req, res) => {
  if (!process.env.TRUCKSTOP_API_KEY) {
    logExt('truckstop', 'spot-rate', 503, 'TRUCKSTOP_API_KEY');
    return res.status(503).json(require503('TRUCKSTOP_API_KEY'));
  }
  res.status(501).json({ error: 'Truckstop integration scaffolded; provider call not yet wired.' });
});

router.get('/integrations/doe/fuel-index', async (req, res) => {
  if (!process.env.DOE_FUEL_API_KEY) {
    logExt('doe', 'fuel-index', 503, 'DOE_FUEL_API_KEY');
    return res.status(503).json(require503('DOE_FUEL_API_KEY'));
  }
  res.status(501).json({ error: 'DOE EIA fuel-index integration scaffolded; provider call not yet wired.' });
});

router.get('/integrations/fmcsa/carrier-score', async (req, res) => {
  const dot = req.query.dot;
  if (!dot) return res.status(400).json({ error: 'dot query param required' });
  if (!process.env.FMCSA_API_KEY) {
    logExt('fmcsa', 'carrier-score', 503, 'FMCSA_API_KEY');
    return res.status(503).json(require503('FMCSA_API_KEY'));
  }
  res.status(501).json({ error: 'FMCSA SAFER integration scaffolded; provider call not yet wired.' });
});

router.get('/integrations/carbon/emissions', async (req, res) => {
  if (!process.env.CARBON_API_KEY) {
    logExt('carbon', 'emissions', 503, 'CARBON_API_KEY');
    return res.status(503).json(require503('CARBON_API_KEY'));
  }
  res.status(501).json({ error: 'Carbon emissions integration scaffolded; provider call not yet wired.' });
});

// ────────────────────────────────────────────────────────────────────────────
// Billing — PRODUCT-DECISION:
//   Default: record an invoice locally (status=draft). If STRIPE_SECRET_KEY is
//   set, attempt a Stripe call (lazy require so missing module doesn't crash
//   the server).
// ────────────────────────────────────────────────────────────────────────────
router.post('/billing/invoices', async (req, res) => {
  try {
    const { customer_email, line_items } = req.body || {};
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: 'line_items array required' });
    }
    const total = line_items.reduce((sum, li) =>
      sum + (Number(li.qty || 1) * Number(li.unit_amount_usd || 0)), 0);
    const ins = await db.query(
      `INSERT INTO bp5_invoices (user_id, customer_email, line_items, total_usd, status)
       VALUES ($1,$2,$3,$4,'draft') RETURNING id, total_usd, status, created_at`,
      [req.user?.id || null, customer_email || null, JSON.stringify(line_items), total]
    );
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ invoice: ins.rows[0], stripe: null, missing: 'STRIPE_SECRET_KEY' });
    }
    let stripeId = null;
    try {
      // Lazy require — never crashes boot if 'stripe' isn't installed.
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // Minimal create — don't auto-finalize. Caller can finalize via dashboard.
      const inv = await stripe.invoices.create({
        customer_email,
        collection_method: 'send_invoice',
        days_until_due: 30,
        description: `Freight invoice #${ins.rows[0].id}`
      });
      stripeId = inv.id;
      await db.query(`UPDATE bp5_invoices SET stripe_invoice_id=$1, status='sent_to_stripe' WHERE id=$2`,
        [stripeId, ins.rows[0].id]).catch(() => {});
    } catch (e) {
      return res.json({
        invoice: ins.rows[0],
        stripe_error: e.message,
        note: 'Local invoice saved; Stripe call failed (module missing or API error)'
      });
    }
    res.json({ invoice: { ...ins.rows[0], stripe_invoice_id: stripeId } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/billing/invoices', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, customer_email, total_usd, status, stripe_invoice_id, created_at
       FROM bp5_invoices WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ────────────────────────────────────────────────────────────────────────────
// Customer notification engine — PRODUCT-DECISION:
//   Default: log to bp5_notifications. If SENDGRID_API_KEY set, attempt
//   send via fetch (no SDK install required).
// ────────────────────────────────────────────────────────────────────────────
router.post('/notifications/send', async (req, res) => {
  try {
    const { channel = 'email', to, subject, body } = req.body || {};
    if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' });
    const ins = await db.query(
      `INSERT INTO bp5_notifications (user_id, channel, to_addr, subject, body, status)
       VALUES ($1,$2,$3,$4,$5,'queued') RETURNING id`,
      [req.user?.id || null, channel, to, subject, body]
    );
    if (channel === 'email' && process.env.SENDGRID_API_KEY) {
      try {
        const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com' },
            subject,
            content: [{ type: 'text/plain', value: body }]
          })
        });
        const status = r.status;
        await db.query(
          `UPDATE bp5_notifications SET status=$1, provider_response=$2 WHERE id=$3`,
          [r.ok ? 'sent' : 'failed', `sendgrid status=${status}`, ins.rows[0].id]
        ).catch(() => {});
        return res.json({ id: ins.rows[0].id, sent: r.ok, provider: 'sendgrid', status });
      } catch (e) {
        await db.query(
          `UPDATE bp5_notifications SET status='failed', provider_response=$1 WHERE id=$2`,
          [e.message, ins.rows[0].id]
        ).catch(() => {});
        return res.json({ id: ins.rows[0].id, sent: false, error: e.message });
      }
    }
    res.json({
      id: ins.rows[0].id,
      sent: false,
      note: 'Logged only; set SENDGRID_API_KEY to enable email send.',
      missing: process.env.SENDGRID_API_KEY ? null : 'SENDGRID_API_KEY'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/notifications', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, channel, to_addr, subject, status, created_at
       FROM bp5_notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ────────────────────────────────────────────────────────────────────────────
// Agentic spot-market trader — TOO-RISKY mitigations:
//   - NEVER books carriers automatically.
//   - Returns a recommendation (action: bid_now / wait / pass) only.
//   - Locked to a manual-review workflow.
// ────────────────────────────────────────────────────────────────────────────
router.post('/agent/spot-recommend', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json(require503('OPENROUTER_API_KEY'));
    const { origin, destination, mode = 'FTL', target_price_usd, urgency = 'normal' } = req.body || {};
    if (!origin || !destination) return res.status(400).json({ error: 'origin, destination required' });
    const recent = await db.query(
      `SELECT origin, destination, AVG(price_per_mile) AS avg_ppm, COUNT(*) AS n
       FROM shipments WHERE origin ILIKE $1 AND destination ILIKE $2
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY origin, destination`,
      [`%${origin}%`, `%${destination}%`]
    ).catch(() => ({ rows: [] }));
    const sys = 'You are a spot-market freight broker assistant. NEVER book carriers; only RECOMMEND. Return STRICT JSON.';
    const user = `Lane: ${origin} -> ${destination} (${mode}); urgency=${urgency}; target=${target_price_usd || 'n/a'}.\nRecent lane stats: ${JSON.stringify(recent.rows)}\nReturn JSON: {"action":"bid_now|wait|pass","confidence_pct":0,"recommended_bid_usd":0,"rationale":"","auto_book":false}`;
    const raw = await askAI(sys, user);
    const parsed = parseAIJson(raw) || { raw };
    parsed.auto_book = false; // hard guardrail
    await db.query(
      `INSERT INTO bp5_agent_runs (user_id, kind, input, output) VALUES ($1,'spot-recommend',$2,$3)`,
      [req.user?.id || null, JSON.stringify(req.body || {}), JSON.stringify(parsed)]
    ).catch(() => {});
    await persistAIResult({ userId: req.user?.id, entityType: 'spot', analysisType: 'recommend', raw, parsed }).catch(() => {});
    res.json({ recommendation: parsed, lane_stats: recent.rows, disclaimer: 'Recommendation only. Auto-booking disabled.' });
  } catch (err) {
    if ((err.message || '').includes('OPENROUTER_API_KEY')) return res.status(503).json(require503('OPENROUTER_API_KEY'));
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Multimodal optimization — TOO-RISKY mitigations:
//   - Heuristic, not an LP solver. Ranks 3 modes by simple score.
//   - AI only used to narrate; the math is deterministic.
// ────────────────────────────────────────────────────────────────────────────
router.post('/optimize/multimodal', async (req, res) => {
  try {
    const { weight_lbs = 1000, distance_miles = 500, urgency = 'normal' } = req.body || {};
    const ppm = { parcel: 4.0, ltl: 2.4, ftl: 1.6, intermodal: 1.1, air: 9.0 };
    const transit_factor = { parcel: 1, ltl: 2, ftl: 1.2, intermodal: 4, air: 0.4 };
    // Eligibility heuristic
    const opts = [];
    for (const mode of Object.keys(ppm)) {
      let cost = ppm[mode] * distance_miles;
      if (mode === 'parcel' && weight_lbs > 150) continue;
      if (mode === 'ltl' && (weight_lbs < 150 || weight_lbs > 15000)) continue;
      if (mode === 'ftl' && weight_lbs > 45000) continue;
      if (mode === 'air' && distance_miles < 200) continue;
      const transit_days = Math.ceil((distance_miles / 500) * transit_factor[mode]);
      const score =
        (urgency === 'urgent' ? -transit_days * 100 : 0) +
        (urgency === 'cheapest' ? -cost : 0) +
        -cost * 0.5 - transit_days * 25;
      opts.push({ mode, cost_usd: Math.round(cost), transit_days, score: Math.round(score) });
    }
    opts.sort((a, b) => b.score - a.score);
    res.json({ options: opts.slice(0, 3), method: 'heuristic-no-LP', disclaimer: 'Heuristic ranking only.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ────────────────────────────────────────────────────────────────────────────
// Vision-based damage assessment — TOO-RISKY mitigations:
//   - Heuristic stub. No model invoked. Returns disclaimer.
//   - Real model gated by `DAMAGE_VISION_PROVIDER` env (not implemented).
// ────────────────────────────────────────────────────────────────────────────
router.post('/vision/damage-assess', async (req, res) => {
  try {
    const { description = '', photo_count = 0 } = req.body || {};
    const txt = String(description).toLowerCase();
    let severity = 'minor';
    let confidence = 0.4;
    if (/total|destroyed|severe/.test(txt)) { severity = 'severe'; confidence = 0.6; }
    else if (/dent|crack|leak|broken/.test(txt)) { severity = 'moderate'; confidence = 0.55; }
    res.json({
      severity,
      confidence,
      photo_count,
      provider: 'heuristic-stub',
      disclaimer: 'NOT a settlement determination. Final adjudication requires a human adjuster.',
      missing: process.env.DAMAGE_VISION_PROVIDER ? null : 'DAMAGE_VISION_PROVIDER (e.g. tractable, ccc-one) — heuristic stub in use'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Diagnostics
router.get('/_diagnostics', (req, res) => {
  const env = ['DAT_API_KEY','TRUCKSTOP_API_KEY','DOE_FUEL_API_KEY','FMCSA_API_KEY','CARBON_API_KEY','STRIPE_SECRET_KEY','SENDGRID_API_KEY','OPENROUTER_API_KEY'];
  res.json({
    env: env.reduce((acc, k) => ({ ...acc, [k]: !!process.env[k] }), {}),
    missing: env.filter(k => !process.env[k])
  });
});

module.exports = router;
