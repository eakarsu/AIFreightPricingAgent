const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

// ── Production hardening ──
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Health endpoint (no auth)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Customer portal (public, token-validated inside)
app.use('/api/portal', require('./routes/portal'));

// Apply auth middleware to everything else
app.use(auth);

// ── Auto audit trail middleware ──
app.use(async (req, res, next) => {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();
  const ENTITY_MAP = {
    '/api/carriers': 'carrier', '/api/customers': 'customer', '/api/routes': 'route',
    '/api/shipments': 'shipment', '/api/rate-quotes': 'rate_quote', '/api/contracts': 'contract',
    '/api/pricing-rules': 'pricing_rule', '/api/market-intelligence': 'market_intelligence',
    '/api/cost-optimization': 'cost_optimization'
  };
  let matched = null;
  for (const prefix of Object.keys(ENTITY_MAP)) {
    if (req.path.startsWith(prefix)) { matched = ENTITY_MAP[prefix]; break; }
  }
  if (!matched) return next();
  const action = req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : 'delete';
  // Defer the audit insert to after the handler — capture entity_id from response
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const entityId = body?.id || (req.params?.id ? parseInt(req.params.id) : null);
    db.query(
      `INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ($1,$2,$3,$4)`,
      [matched, entityId || null, action, req.user?.name || 'system']
    ).catch(() => {});
    return origJson(body);
  };
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/carriers', require('./routes/carriers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/rate-quotes', require('./routes/rateQuotes'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/pricing-rules', require('./routes/pricingRules'));
app.use('/api/market-intelligence', require('./routes/marketIntelligence'));
app.use('/api/cost-optimization', require('./routes/costOptimization'));
app.use('/api/audit-trail', require('./routes/auditTrail'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/backlog', require('./routes/backlogPass5'));
app.use('/api/spot-market', require('./routes/spotMarketAgent'));
app.use('/api/multimodal-optimize', require('./routes/multimodalOptimizer'));
app.use('/api/damage-vision', require('./routes/damageVisionAssessor'));
app.use('/api/detention-demurrage-predictor', require('./routes/detentionDemurragePredictor'));

// ── AI Results listing ──
app.get('/api/ai-results', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const [data, count] = await Promise.all([
      db.query('SELECT * FROM ai_results ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM ai_results')
    ]);
    const total = parseInt(count.rows[0].count);
    res.json({ data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Spot rates ingestion + listing ──
app.get('/api/spot-rates', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM spot_rates ORDER BY recorded_at DESC LIMIT 200');
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/spot-rates', async (req, res) => {
  try {
    const { lane, origin, destination, mode, spot_price, source } = req.body;
    const r = await db.query(
      `INSERT INTO spot_rates (lane, origin, destination, mode, spot_price, source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [lane, origin, destination, mode, spot_price, source || 'manual']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Lane elasticity listing ──
app.get('/api/lane-elasticity', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM lane_elasticity ORDER BY updated_at DESC LIMIT 200');
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('[boot] WARNING: OPENROUTER_API_KEY missing — AI endpoints will return 500.');
}

app.use('/api/governed-quotes', require('./routes/governedQuotes'));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
