-- Task Manager RLHF (Reinforcement Learning from Human Feedback) Tables
-- Enables Task Manager AI to learn from staff feedback and improve over time

-- Task Manager AI Drafts (for staff review)
CREATE TABLE IF NOT EXISTS task_manager_drafts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_draft TEXT NOT NULL,
  intent TEXT NOT NULL,
  context_data TEXT, -- JSON
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, edited, rejected
  quality_score INTEGER, -- 1-5 stars
  final_response TEXT, -- Approved or edited response
  staff_feedback TEXT, -- Optional feedback on why rejected/edited
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff_users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_manager_drafts_staff ON task_manager_drafts(staff_id);
CREATE INDEX IF NOT EXISTS idx_task_manager_drafts_status ON task_manager_drafts(status);
CREATE INDEX IF NOT EXISTS idx_task_manager_drafts_conversation ON task_manager_drafts(conversation_id);

-- Task Manager Learning Examples (high-quality responses for few-shot learning)
CREATE TABLE IF NOT EXISTS task_manager_learning_examples (
  id TEXT PRIMARY KEY,
  intent TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  quality_score INTEGER NOT NULL, -- 4-5 stars only
  context_type TEXT NOT NULL, -- task_management, workload_analysis, etc.
  metadata TEXT, -- JSON with additional context
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_manager_learning_intent ON task_manager_learning_examples(intent);
CREATE INDEX IF NOT EXISTS idx_task_manager_learning_quality ON task_manager_learning_examples(quality_score);
CREATE INDEX IF NOT EXISTS idx_task_manager_learning_active ON task_manager_learning_examples(is_active);

