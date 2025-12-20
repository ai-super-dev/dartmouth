-- Create users table for Week 4 Auth API
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create test user
-- Email: test@example.com
-- Password: testpassword123
-- Password hash: tVyHktHORY4nkwiDX4qXtYAmNQPnbhmY4nlwPjWtDC4=
INSERT INTO users (user_id, email, name, password_hash, created_at) 
VALUES (
  'test-user-001', 
  'test@example.com', 
  'Test User', 
  'tVyHktHORY4nkwiDX4qXtYAmNQPnbhmY4nlwPjWtDC4=', 
  datetime('now')
);

