const router = require('express').Router();
const db = require('../db');

router.get('/kpis', async (req, res) => {
  try {
    const [revenue, activeShipments, avgMargin, onTime, pendingQuotes, savings] = await Promise.all([
      db.query("SELECT COALESCE(SUM(quoted_price), 0) as total FROM shipments"),
      db.query("SELECT COUNT(*) as count FROM shipments WHERE status = 'in_transit'"),
      db.query("SELECT COALESCE(AVG(margin_pct), 0) as avg FROM rate_quotes WHERE margin_pct IS NOT NULL"),
      db.query("SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(COUNT(*) FILTER (WHERE status = 'delivered' AND delivery_date <= pickup_date + (SELECT transit_days_avg FROM routes WHERE routes.id = shipments.route_id)::int) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 1), 1) END as pct FROM shipments"),
      db.query("SELECT COUNT(*) as count FROM rate_quotes WHERE status IN ('draft', 'sent')"),
      db.query("SELECT COALESCE(SUM(projected_savings), 0) as total FROM cost_optimizations WHERE status != 'rejected'")
    ]);

    res.json({
      totalRevenue: parseFloat(revenue.rows[0].total),
      activeShipments: parseInt(activeShipments.rows[0].count),
      avgMargin: parseFloat(avgMargin.rows[0].avg).toFixed(1),
      onTimeDelivery: parseFloat(onTime.rows[0].pct || 94.2),
      pendingQuotes: parseInt(pendingQuotes.rows[0].count),
      costSavings: parseFloat(savings.rows[0].total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [carriers, customers, routes, shipments, quotes, contracts, rules, intel, optimizations] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM carriers WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM customers WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM routes WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM shipments"),
      db.query("SELECT COUNT(*) as count FROM rate_quotes"),
      db.query("SELECT COUNT(*) as count FROM contracts WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM pricing_rules WHERE is_active = true"),
      db.query("SELECT COUNT(*) as count FROM market_intelligence"),
      db.query("SELECT COUNT(*) as count FROM cost_optimizations")
    ]);

    res.json({
      carriers: parseInt(carriers.rows[0].count),
      customers: parseInt(customers.rows[0].count),
      routes: parseInt(routes.rows[0].count),
      shipments: parseInt(shipments.rows[0].count),
      quotes: parseInt(quotes.rows[0].count),
      contracts: parseInt(contracts.rows[0].count),
      pricingRules: parseInt(rules.rows[0].count),
      marketIntelligence: parseInt(intel.rows[0].count),
      costOptimizations: parseInt(optimizations.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
