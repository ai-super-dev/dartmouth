-- Migration to add 'queued' status to chat_conversations

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly.
-- We need to recreate the table with the new constraint.

-- Step 1: Create a new table with the updated CHECK constraint
CREATE TABLE chat_conversations_new (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in-progress', 'closed', 'escalated', 'queued')),
  assigned_to TEXT DEFAULT 'ai-agent-001',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  last_message_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Resolution tracking fields
  resolution_type TEXT CHECK(resolution_type IN ('ai_resolved', 'staff_resolved', 'inactive_closed')),
  resolved_by TEXT,
  resolved_at TEXT,
  -- Queue management fields
  queue_entered_at TEXT,
  queue_assigned_at TEXT,
  -- Priority and sentiment
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
  sentiment TEXT DEFAULT 'neutral' CHECK(sentiment IN ('positive', 'neutral', 'negative', 'angry')),
  -- Inactive tracking
  last_activity_at TEXT,
  inactive_warning_count INTEGER DEFAULT 0,
  -- Post-chat survey
  survey_rating INTEGER,
  survey_thumbs TEXT CHECK(survey_thumbs IN ('up', 'down')),
  survey_feedback TEXT,
  survey_submitted_at TEXT
);

-- Step 2: Copy data from old table to new table
INSERT INTO chat_conversations_new 
SELECT * FROM chat_conversations;

-- Step 3: Drop the old table
DROP TABLE chat_conversations;

-- Step 4: Rename new table to original name
ALTER TABLE chat_conversations_new RENAME TO chat_conversations;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_ticket_id ON chat_conversations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_id ON chat_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_to ON chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_resolution_type ON chat_conversations(resolution_type);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_queue_entered_at ON chat_conversations(queue_entered_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_activity_at ON chat_conversations(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_priority ON chat_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_sentiment ON chat_conversations(sentiment);

