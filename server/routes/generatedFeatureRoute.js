const express = require('express');
const { askAI } = require('../services/openrouter');

module.exports = function createGeneratedFeatureRoute({ slug, title, description }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const input = req.body?.input || '';
      const context = req.body?.context || {};

      if (!process.env.OPENROUTER_API_KEY) {
        return res.json({
          feature: slug,
          title,
          description,
          result: 'Configure OPENROUTER_API_KEY for live AI output. Stub returning echo.',
          input,
        });
      }

      const prompt = `Feature: ${title}
Description: ${description}
User input: ${input}
Context: ${JSON.stringify(context)}

Provide a structured, actionable freight-pricing response with summary, key findings, recommendations, risks, assumptions, and next steps.`;

      const result = await askAI('You are an expert freight pricing and logistics AI assistant.', prompt);
      res.json({ feature: slug, title, description, result });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  return router;
};
