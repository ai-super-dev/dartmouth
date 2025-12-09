-- Chat History Database Migration
-- Copy and paste this entire file into Cloudflare Dashboard D1 Console
-- Go to: https://dash.cloudflare.com/ → Workers & Pages → D1 → dartmouth-os-db → Console
-- Or create a new database called "pa_ai_chat_history" and run this there

-- Create chat history table
CREATE TABLE IF NOT EXISTS pa_ai_chat_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES pa_ai_users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON pa_ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON pa_ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON pa_ai_chat_history(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_created ON pa_ai_chat_history(user_id, created_at);

