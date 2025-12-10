-- Migration to implement cleaner chat status model
-- Statuses: ai_handling, queued, assigned, staff_handling, closed
-- Resolution types: ai_resolved, staff_resolved, inactive_closed, abandoned

-- Step 1: Create a new table with the updated status model
CREATE TABLE chat_conversations_v2 (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  -- New cleaner status model
  status TEXT DEFAULT 'ai_handling' CHECK(status IN ('ai_handling', 'queued', 'assigned', 'staff_handling', 'closed')),
  assigned_to TEXT DEFAULT 'ai-agent-001',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  last_message_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Resolution tracking (for closed status)
  resolution_type TEXT CHECK(resolution_type IN ('ai_resolved', 'staff_resolved', 'inactive_closed', 'abandoned')),
  resolved_by TEXT,
  resolved_at TEXT,
  -- Queue management
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

-- Step 2: Migrate data with status mapping
-- old 'open' or 'in-progress' with ai-agent-001 -> 'ai_handling'
-- old 'queued' -> 'queued'
-- old 'escalated' with assigned_to -> 'staff_handling'
-- old 'closed' -> 'closed'
INSERT INTO chat_conversations_v2 (
  id, ticket_id, customer_id, customer_name, customer_email,
  status, assigned_to, started_at, ended_at, last_message_at,
  created_at, updated_at, resolution_type, resolved_by, resolved_at,
  queue_entered_at, queue_assigned_at, priority, sentiment,
  last_activity_at, inactive_warning_count,
  survey_rating, survey_thumbs, survey_feedback, survey_submitted_at
)
SELECT 
  id, ticket_id, customer_id, customer_name, customer_email,
  CASE 
    WHEN status = 'closed' THEN 'closed'
    WHEN status = 'queued' THEN 'queued'
    WHEN status = 'escalated' AND assigned_to IS NOT NULL AND assigned_to != 'ai-agent-001' THEN 'staff_handling'
    WHEN status IN ('open', 'in-progress') AND (assigned_to IS NULL OR assigned_to = 'ai-agent-001') THEN 'ai_handling'
    WHEN status IN ('open', 'in-progress') AND assigned_to IS NOT NULL AND assigned_to != 'ai-agent-001' THEN 'staff_handling'
    ELSE 'ai_handling'
  END as status,
  assigned_to, started_at, ended_at, last_message_at,
  created_at, updated_at, resolution_type, resolved_by, resolved_at,
  queue_entered_at, queue_assigned_at, priority, sentiment,
  last_activity_at, inactive_warning_count,
  survey_rating, survey_thumbs, survey_feedback, survey_submitted_at
FROM chat_conversations;

-- Step 3: Drop the old table
DROP TABLE chat_conversations;

-- Step 4: Rename new table to original name
ALTER TABLE chat_conversations_v2 RENAME TO chat_conversations;

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

