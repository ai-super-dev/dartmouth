-- Migration 0046: Create task_drafts table
-- Date: 2025-12-09
-- Purpose: Store AI-generated drafts for tasks requiring human approval

CREATE TABLE IF NOT EXISTS task_drafts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  draft_type TEXT NOT NULL, -- 'response', 'action', 'update'
  content TEXT NOT NULL,
  metadata TEXT, -- JSON for additional data
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by TEXT,
  approved_at TEXT,
  rejected_by TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tickets(ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_task_drafts_task_id ON task_drafts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_drafts_status ON task_drafts(status);

