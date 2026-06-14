-- Xeno CRM Database Schema
-- All tables use UUID primary keys for distributed-friendly IDs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users (Tenants) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email) -- A business can only have one customer with a specific email
);

-- ─── Orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  items JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'completed',
  ordered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Segments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  ai_prompt TEXT,
  customer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Campaigns ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  segment_id UUID REFERENCES segments(id),
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp','sms','email','rcs')),
  message_template TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','completed','partially_failed','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  stats JSONB DEFAULT '{"sent":0,"delivered":0,"failed":0,"opened":0,"read":0,"clicked":0}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Message Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(50) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  personalized_message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','opened','read','clicked')),
  external_message_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Message Events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_log_id UUID REFERENCES message_logs(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_log_id, status)
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_id ON message_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_idempotency ON message_logs(idempotency_key);
