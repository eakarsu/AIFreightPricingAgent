const db = require('../db');
const { MODEL } = require('./openrouter');

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      entity_type VARCHAR(100),
      entity_id INTEGER,
      analysis_type VARCHAR(100),
      model VARCHAR(255),
      raw_response TEXT,
      parsed_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_results_entity ON ai_results(entity_type, entity_id);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quote_share_tokens (
      id SERIAL PRIMARY KEY,
      quote_id INTEGER NOT NULL,
      token VARCHAR(64) UNIQUE NOT NULL,
      ai_justification TEXT,
      created_by VARCHAR(255),
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON quote_share_tokens(token);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS lane_elasticity (
      id SERIAL PRIMARY KEY,
      origin VARCHAR(255),
      destination VARCHAR(255),
      mode VARCHAR(50),
      total_quotes INTEGER DEFAULT 0,
      accepted_quotes INTEGER DEFAULT 0,
      avg_accept_price DECIMAL(12,2),
      avg_decline_price DECIMAL(12,2),
      coefficient DECIMAL(8,4),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(origin, destination, mode)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS spot_rates (
      id SERIAL PRIMARY KEY,
      lane VARCHAR(255),
      origin VARCHAR(255),
      destination VARCHAR(255),
      mode VARCHAR(50),
      spot_price DECIMAL(12,2),
      source VARCHAR(100),
      recorded_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function persistAIResult({ userId, entityType, entityId, analysisType, raw, parsed }) {
  try {
    await db.query(
      `INSERT INTO ai_results (user_id, entity_type, entity_id, analysis_type, model, raw_response, parsed_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId || null, entityType || null, entityId || null, analysisType || null, MODEL,
       raw, parsed ? JSON.stringify(parsed) : null]
    );
  } catch (e) { console.warn('[ai_results] persist failed:', e.message); }
}

module.exports = { ensureSchema, persistAIResult };
