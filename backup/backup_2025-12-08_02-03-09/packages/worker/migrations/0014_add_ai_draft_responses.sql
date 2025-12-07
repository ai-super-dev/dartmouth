-- Migration 0014: Add AI Draft Responses Table
-- Date: 2025-12-02
-- Purpose: Store AI-generated draft responses for tickets

CREATE TABLE IF NOT EXISTS ai_draft_responses (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  draft_content TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  intent TEXT,
  handler_used TEXT,
  reasoning TEXT,
  suggested_actions TEXT, -- JSON array
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, edited, rejected
  
  -- Escalation
  should_escalate BOOLEAN DEFAULT 0,
  escalation_reason TEXT,
  
  -- Metadata
  shopify_data TEXT, -- JSON
  perp_data TEXT, -- JSON
  processing_time_ms INTEGER,
  
  -- Approval tracking
  approved_by TEXT,
  approved_at DATETIME,
  edited_content TEXT,
  rejection_reason TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES staff_users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_drafts_ticket ON ai_draft_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_draft_responses(status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_created ON ai_draft_responses(created_at);

-- Index for finding pending drafts
CREATE INDEX IF NOT EXISTS idx_ai_drafts_pending ON ai_draft_responses(ticket_id, status) 
WHERE status = 'pending';

