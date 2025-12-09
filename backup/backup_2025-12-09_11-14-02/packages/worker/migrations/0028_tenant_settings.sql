-- Migration: Multi-Tenant Regional Settings
-- Created: December 5, 2025
-- Purpose: Enable tenant-level configuration for SaaS deployment

-- Tenant Settings (one row per tenant)
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'My Business',
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_website TEXT,
  timezone TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  language TEXT NOT NULL DEFAULT 'en-AU',
  measurement_system TEXT NOT NULL DEFAULT 'metric' CHECK(measurement_system IN ('metric', 'imperial')),
  currency TEXT NOT NULL DEFAULT 'AUD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '12h' CHECK(time_format IN ('12h', '24h')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default tenant settings
INSERT OR IGNORE INTO tenant_settings (
  tenant_id,
  business_name,
  business_email,
  timezone,
  language,
  measurement_system,
  currency,
  currency_symbol,
  date_format,
  time_format
) VALUES (
  'default',
  'Amazing Transfers',
  'support@amazingtransfers.com.au',
  'Australia/Brisbane',
  'en-AU',
  'metric',
  'AUD',
  '$',
  'DD/MM/YYYY',
  '12h'
);

-- Agent Regional Overrides (NULL = inherit from tenant)
CREATE TABLE IF NOT EXISTS agent_regional_overrides (
  agent_id TEXT PRIMARY KEY,
  timezone TEXT,
  language TEXT,
  measurement_system TEXT,
  currency TEXT,
  currency_symbol TEXT,
  date_format TEXT,
  time_format TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to update tenant_settings.updated_at
CREATE TRIGGER IF NOT EXISTS update_tenant_settings_timestamp
AFTER UPDATE ON tenant_settings
FOR EACH ROW
BEGIN
  UPDATE tenant_settings SET updated_at = datetime('now') WHERE tenant_id = OLD.tenant_id;
END;

-- Trigger to update agent_regional_overrides.updated_at
CREATE TRIGGER IF NOT EXISTS update_agent_overrides_timestamp
AFTER UPDATE ON agent_regional_overrides
FOR EACH ROW
BEGIN
  UPDATE agent_regional_overrides SET updated_at = datetime('now') WHERE agent_id = OLD.agent_id;
END;
