CREATE TABLE IF NOT EXISTS governed_quotes (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, shipment_reference TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL,
  mode TEXT NOT NULL, weight NUMERIC NOT NULL, weight_unit TEXT NOT NULL, distance NUMERIC NOT NULL, distance_unit TEXT NOT NULL,
  cost_amount NUMERIC(14,2), price_amount NUMERIC(14,2), currency CHAR(3) NOT NULL, margin_percent NUMERIC(7,3),
  rate_valid_until TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'draft', inputs JSONB NOT NULL, evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key TEXT NOT NULL, created_by BIGINT NOT NULL, approved_by BIGINT, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, idempotency_key), CONSTRAINT quote_stage CHECK(status IN ('draft','costed','review','approved','offered','accepted','booked','expired'))
);
CREATE TABLE IF NOT EXISTS quote_overrides (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id BIGINT NOT NULL REFERENCES governed_quotes(id), actor_user_id BIGINT NOT NULL,
  field_name TEXT NOT NULL, old_value TEXT, new_value TEXT, reason TEXT NOT NULL, approved_by BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS freight_integration_runs (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, data_as_of TIMESTAMPTZ, status TEXT NOT NULL,
  error_code TEXT, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT freight_integration_status CHECK(status IN ('running','succeeded','failed','stale'))
);
CREATE TABLE IF NOT EXISTS freight_audit_events (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, actor_user_id BIGINT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  before_state JSONB, after_state JSONB, request_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS governed_quote_tenant_status_idx ON governed_quotes(tenant_id,status);
