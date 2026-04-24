const router = require('express').Router();
const db = require('../db');
const { askAI } = require('../services/openrouter');

router.get('/', async (req, res) => {
  try {
    const { search, category, status, priority } = req.query;
    let query = 'SELECT * FROM cost_optimizations WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (title ILIKE $${params.length})`; }
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND priority = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cost_optimizations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Optimization not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, category, current_cost, projected_savings, savings_pct, status, ai_recommendation, priority, affected_routes, implementation_notes } = req.body;
    const result = await db.query(
      `INSERT INTO cost_optimizations (title, category, current_cost, projected_savings, savings_pct, status, ai_recommendation, priority, affected_routes, implementation_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, category, current_cost, projected_savings, savings_pct, status || 'identified', ai_recommendation, priority || 'medium', affected_routes, implementation_notes]
    );
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('cost_optimization', $1, 'create', $2)`,
      [result.rows[0].id, req.user?.name || 'system']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/optimize', async (req, res) => {
  try {
    const { category, description, current_spend } = req.body;

    const systemPrompt = `You are a logistics cost optimization specialist for a global freight platform. Analyze shipping operations and provide specific, actionable cost reduction recommendations. Structure your response:

**Optimization Opportunity**: Clear description of the opportunity
**Current State Analysis**: What's happening now and why it's suboptimal
**Recommended Actions**:
1. Specific action items with expected impact
2. Each with timeline and complexity
**Projected Savings**: Specific dollar amounts and percentages
**Implementation Plan**: Step-by-step approach
**Risk Assessment**: Potential risks and mitigation strategies
**Priority Level**: Critical/High/Medium/Low with justification`;

    const userPrompt = `Analyze and optimize freight costs:
- Category: ${category || 'General'}
- Description: ${description || 'Overall freight spend optimization'}
- Current Monthly Spend: ${current_spend ? '$' + current_spend : 'Not specified'}

Provide detailed cost optimization recommendations.`;

    const aiResponse = await askAI(systemPrompt, userPrompt);
    res.json({ ai_recommendation: aiResponse, category, description });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, category, current_cost, projected_savings, savings_pct, status, ai_recommendation, priority, affected_routes, implementation_notes } = req.body;
    const result = await db.query(
      `UPDATE cost_optimizations SET title=$1, category=$2, current_cost=$3, projected_savings=$4, savings_pct=$5, status=$6, ai_recommendation=$7, priority=$8, affected_routes=$9, implementation_notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, category, current_cost, projected_savings, savings_pct, status, ai_recommendation, priority, affected_routes, implementation_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Optimization not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('cost_optimization', $1, 'update', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM cost_optimizations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Optimization not found' });
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, user_name) VALUES ('cost_optimization', $1, 'delete', $2)`,
      [req.params.id, req.user?.name || 'system']);
    res.json({ message: 'Optimization deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
