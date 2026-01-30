-- GetAdScore API Database Schema
-- Run this in your Vercel Postgres / Neon dashboard

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,  -- First chars for display (gads_xxxx)
  name VARCHAR(100),
  user_email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) DEFAULT 'free',  -- free, individual, agency
  requests_today INT DEFAULT 0,
  last_request_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  brand_name VARCHAR(255),
  media_url TEXT,
  media_type VARCHAR(20),
  score INT,
  verdict VARCHAR(50),
  summary JSONB,
  scores JSONB,
  top_fixes JSONB,
  full_result JSONB,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_reports_api_key ON reports(api_key_id);
CREATE INDEX IF NOT EXISTS idx_reports_expiry ON reports(expires_at);

-- Rate limit tiers (for reference)
-- free: 10 requests/day
-- individual: 100 requests/day
-- agency: 500 requests/day
