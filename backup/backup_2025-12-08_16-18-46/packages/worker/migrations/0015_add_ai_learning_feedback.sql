-- Add feedback and learning fields to ai_draft_responses table
-- This enables RLHF (Reinforcement Learning from Human Feedback)

ALTER TABLE ai_draft_responses ADD COLUMN quality_score INTEGER DEFAULT NULL; -- 1-5 stars
ALTER TABLE ai_draft_responses ADD COLUMN edit_distance INTEGER DEFAULT NULL; -- How many characters changed
ALTER TABLE ai_draft_responses ADD COLUMN was_helpful BOOLEAN DEFAULT NULL; -- Did draft save time?
ALTER TABLE ai_draft_responses ADD COLUMN improvement_notes TEXT DEFAULT NULL; -- What could be better?
ALTER TABLE ai_draft_responses ADD COLUMN feedback_submitted_at DATETIME DEFAULT NULL;
ALTER TABLE ai_draft_responses ADD COLUMN feedback_submitted_by TEXT DEFAULT NULL;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_draft_quality ON ai_draft_responses(quality_score, status, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_draft_helpful ON ai_draft_responses(was_helpful, created_at);

-- Create ai_learning_examples table for storing best responses
CREATE TABLE IF NOT EXISTS ai_learning_examples (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    customer_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    intent TEXT,
    sentiment TEXT,
    quality_score INTEGER,
    is_active BOOLEAN DEFAULT TRUE, -- Can be disabled if no longer relevant
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draft_id) REFERENCES ai_draft_responses(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_learning_active ON ai_learning_examples(is_active, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_intent ON ai_learning_examples(intent, is_active);

