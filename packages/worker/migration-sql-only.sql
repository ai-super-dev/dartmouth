-- Copy and paste this entire file into Cloudflare Dashboard D1 Console
-- Go to: https://dash.cloudflare.com/ → Workers & Pages → D1 → dartmouth-os-db → Console

CREATE TABLE IF NOT EXISTS pa_ai_users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  profile_photo_url TEXT,
  group_ids TEXT,
  default_group_id TEXT,
  timezone TEXT DEFAULT 'Australia/Sydney',
  home_address TEXT,
  work_address TEXT,
  currency TEXT DEFAULT 'AUD',
  locale TEXT DEFAULT 'en-AU',
  default_shopping_list_id TEXT,
  safe_times TEXT,
  notification_settings TEXT,
  voice_settings TEXT,
  privacy TEXT,
  calendar_integration TEXT,
  preferred_stores TEXT,
  llm_provider TEXT DEFAULT 'openai',
  conversation_style TEXT DEFAULT 'friendly',
  theme TEXT DEFAULT 'light',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  app_version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_pa_ai_users_email ON pa_ai_users(email);
CREATE INDEX IF NOT EXISTS idx_pa_ai_users_status ON pa_ai_users(status);
CREATE INDEX IF NOT EXISTS idx_pa_ai_users_timezone ON pa_ai_users(timezone);

