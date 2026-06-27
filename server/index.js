const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');
const { ensureSchema } = require('./services/aiResults');
const createGeneratedFeatureRoute = require('./routes/generatedFeatureRoute');

// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_dynamic_rate_calculator_endpoint_real = require('./routes/gap-no-dynamic-rate-calculator-endpoint-real');
const route_gap_no_carrier_capacity_forecast = require('./routes/gap-no-carrier-capacity-forecast');
const route_gap_no_contract_optimization_recommender = require('./routes/gap-no-contract-optimization-recommender');
const route_gap_no_fraud_detection_on_shipment_patterns = require('./routes/gap-no-fraud-detection-on-shipment-patterns');
const route_gap_no_lane_profitability_analyzer = require('./routes/gap-no-lane-profitability-analyzer');
const route_gap_no_mode_of_shipment_recommender_air = require('./routes/gap-no-mode-of-shipment-recommender-air');
const route_gap_limited_notifications_only_2_file_refere = require('./routes/gap-limited-notifications-only-2-file-refere');
const route_gap_no_webhook_receiversdispatchers = require('./routes/gap-no-webhook-receiversdispatchers');
const route_gap_no_carrier_performance_scorecard_reports = require('./routes/gap-no-carrier-performance-scorecard-reports');
const route_gap_no_exceptionclaim_management_module = require('./routes/gap-no-exceptionclaim-management-module');
const route_gap_no_websocket_real_time_shipment_tracking = require('./routes/gap-no-websocket-real-time-shipment-tracking');
const app = express();
const PORT = process.env.PORT || 3001;

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

// Boot-time schema bootstrap
ensureSchema().then(() => console.log('[schema] ai_results / share-tokens / lane_elasticity ready.'))
  .catch(err => console.warn('[schema] bootstrap warning:', err.message));

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

app.use(errorHandler);


app.use('/api/gap-no-dynamic-rate-calculator-endpoint-real', route_gap_no_dynamic_rate_calculator_endpoint_real);
app.use('/api/gap-no-carrier-capacity-forecast', route_gap_no_carrier_capacity_forecast);
app.use('/api/gap-no-contract-optimization-recommender', route_gap_no_contract_optimization_recommender);
app.use('/api/gap-no-fraud-detection-on-shipment-patterns', route_gap_no_fraud_detection_on_shipment_patterns);
app.use('/api/gap-no-lane-profitability-analyzer', route_gap_no_lane_profitability_analyzer);
app.use('/api/gap-no-mode-of-shipment-recommender-air', route_gap_no_mode_of_shipment_recommender_air);
app.use('/api/gap-limited-notifications-only-2-file-refere', route_gap_limited_notifications_only_2_file_refere);
app.use('/api/gap-no-webhook-receiversdispatchers', route_gap_no_webhook_receiversdispatchers);
app.use('/api/gap-no-carrier-performance-scorecard-reports', route_gap_no_carrier_performance_scorecard_reports);
app.use('/api/gap-no-exceptionclaim-management-module', route_gap_no_exceptionclaim_management_module);
app.use('/api/gap-no-websocket-real-time-shipment-tracking', route_gap_no_websocket_real_time_shipment_tracking);
app.use('/api/cf-agentic-spot-market-trading-agent-monito', createGeneratedFeatureRoute({
  slug: 'cf-agentic-spot-market-trading-agent-monito',
  title: 'Agentic spot-market trading agent monitoring rates and auto-adjusting pricing rules',
  description: 'Monitor spot rates and recommend pricing-rule adjustments.',
}));
app.use('/api/cf-multimodal-optimization-solver-across-tr', createGeneratedFeatureRoute({
  slug: 'cf-multimodal-optimization-solver-across-tr',
  title: 'Multimodal optimization solver across transport modes',
  description: 'Recommend optimized shipment mode mixes across truck, rail, ocean, and air.',
}));
app.use('/api/cf-carrier-compliance-sustainability-tracki', createGeneratedFeatureRoute({
  slug: 'cf-carrier-compliance-sustainability-tracki',
  title: 'Carrier compliance and sustainability tracking',
  description: 'Analyze carrier compliance, sustainability, and risk signals.',
}));
app.use('/api/cf-supply-chain-finance-integration-recomme', createGeneratedFeatureRoute({
  slug: 'cf-supply-chain-finance-integration-recomme',
  title: 'Supply-chain finance integration recommendations',
  description: 'Recommend payment, invoice, and supply-chain finance improvements.',
}));
app.use('/api/cf-customer-demand-forecasting-lane-capacit', createGeneratedFeatureRoute({
  slug: 'cf-customer-demand-forecasting-lane-capacit',
  title: 'Customer demand forecasting and lane capacity planning',
  description: 'Forecast customer demand and lane capacity pressure.',
}));
app.use('/api/cf-vision-based-damage-assessment-accepting', createGeneratedFeatureRoute({
  slug: 'cf-vision-based-damage-assessment-accepting',
  title: 'Vision-based damage assessment accepting photos',
  description: 'Assess cargo damage and claim-readiness from visual evidence.',
}));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
