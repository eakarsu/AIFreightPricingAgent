DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS cost_optimizations CASCADE;
DROP TABLE IF EXISTS market_intelligence CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS rate_quotes CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'analyst',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE carriers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  mode VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  rating DECIMAL(3,2),
  on_time_pct DECIMAL(5,2),
  base_country VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  industry VARCHAR(100),
  tier VARCHAR(20),
  annual_volume DECIMAL(15,2),
  country VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  origin_city VARCHAR(255) NOT NULL,
  origin_country VARCHAR(100) NOT NULL,
  destination_city VARCHAR(255) NOT NULL,
  destination_country VARCHAR(100) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  distance_km INTEGER,
  transit_days_avg DECIMAL(5,1),
  avg_rate_per_kg DECIMAL(10,2),
  volume_last_30d INTEGER,
  congestion_level VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id INTEGER REFERENCES carriers(id) ON DELETE SET NULL,
  route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  weight_kg DECIMAL(12,2),
  volume_cbm DECIMAL(10,3),
  status VARCHAR(30),
  quoted_price DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  pickup_date DATE,
  delivery_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rate_quotes (
  id SERIAL PRIMARY KEY,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  weight_kg DECIMAL(12,2),
  volume_cbm DECIMAL(10,3),
  base_rate DECIMAL(12,2),
  ai_suggested_rate DECIMAL(12,2),
  final_rate DECIMAL(12,2),
  margin_pct DECIMAL(5,2),
  status VARCHAR(20),
  valid_until DATE,
  ai_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id INTEGER REFERENCES carriers(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  mode VARCHAR(50),
  min_volume INTEGER,
  committed_rate DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20),
  terms TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  mode VARCHAR(50),
  condition_field VARCHAR(100),
  condition_operator VARCHAR(20),
  condition_value VARCHAR(255),
  adjustment_type VARCHAR(20),
  adjustment_value DECIMAL(10,2),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE market_intelligence (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  mode VARCHAR(50),
  report_type VARCHAR(50),
  summary TEXT,
  ai_analysis TEXT,
  data_points JSONB,
  severity VARCHAR(20),
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cost_optimizations (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  current_cost DECIMAL(12,2),
  projected_savings DECIMAL(12,2),
  savings_pct DECIMAL(5,2),
  status VARCHAR(20),
  ai_recommendation TEXT,
  priority VARCHAR(20),
  affected_routes TEXT,
  implementation_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  user_name VARCHAR(255),
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
