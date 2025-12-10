-- Migration 0046: Create AI task drafts table
-- Date: 2025-12-09
-- Purpose: Store McCarthy AI task drafts for human approval

CREATE TABLE IF NOT EXISTS ai_task_drafts (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  draft_content TEXT NOT NULL,
  confidence_score INTEGER NOT NULL,
  suggested_actions TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  rejected_by TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_task_drafts_ticket ON ai_task_drafts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_drafts_status ON ai_task_drafts(status);

