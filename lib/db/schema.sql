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

-- Report Views table (analytics)
CREATE TABLE IF NOT EXISTS report_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_slug VARCHAR(100) NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash VARCHAR(16),  -- Hashed for privacy
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for report views
CREATE INDEX IF NOT EXISTS idx_report_views_slug ON report_views(report_slug);
CREATE INDEX IF NOT EXISTS idx_report_views_viewed_at ON report_views(viewed_at);

-- Free users table (tracks free tier usage)
CREATE TABLE IF NOT EXISTS free_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  used_free_at TIMESTAMP,
  free_reports_used INT DEFAULT 0,
  subscribed_at TIMESTAMP,
  plan_type VARCHAR(20),
  stripe_customer_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_users_email ON free_users(email);

-- Migration: Add free_reports_used column if it doesn't exist
-- Run this if upgrading from old schema:
-- ALTER TABLE free_users ADD COLUMN IF NOT EXISTS free_reports_used INT DEFAULT 0;
