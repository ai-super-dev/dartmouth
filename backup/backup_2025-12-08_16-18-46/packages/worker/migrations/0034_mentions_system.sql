-- ============================================================================
-- MIGRATION 0034: @Mentions System
-- ============================================================================
-- Created: December 6, 2025, 8:45 AM AEST
-- Purpose: Enable @mentions functionality across Group Chat and Tickets
-- ============================================================================

-- Mentions Table
CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL,              -- ID of message containing mention
  mentioned_staff_id TEXT NOT NULL,      -- Staff member being mentioned
  mentioning_staff_id TEXT NOT NULL,     -- Staff member who mentioned
  mention_type TEXT NOT NULL,            -- 'staff', 'all', 'ai'
  context_type TEXT NOT NULL,            -- 'group_chat', 'ticket_note'
  context_id TEXT NOT NULL,              -- Channel ID or Ticket ID
  is_read INTEGER NOT NULL DEFAULT 0,    -- 0 = unread, 1 = read
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  
  -- For ticket context
  ticket_id TEXT,
  ticket_number TEXT,
  customer_name TEXT,
  
  -- For AI mentions
  ai_action TEXT,                        -- 'send_message', 'draft_email', 'schedule_callback', etc.
  ai_status TEXT,                        -- 'pending', 'processing', 'complete', 'failed'
  ai_result TEXT                         -- Result/response from AI
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_staff ON mentions(mentioned_staff_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioning_staff ON mentions(mentioning_staff_id);
CREATE INDEX IF NOT EXISTS idx_mentions_context ON mentions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_mentions_ticket ON mentions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mentions_ai_status ON mentions(ai_status);
CREATE INDEX IF NOT EXISTS idx_mentions_message ON mentions(message_id);

-- Update group_chat_messages table to track mentions
ALTER TABLE group_chat_messages ADD COLUMN mention_count INTEGER DEFAULT 0;
ALTER TABLE group_chat_messages ADD COLUMN has_mentions INTEGER DEFAULT 0;

