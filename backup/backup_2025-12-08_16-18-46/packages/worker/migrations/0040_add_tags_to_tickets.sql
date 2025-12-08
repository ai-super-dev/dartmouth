-- Add tags column to tickets table for AI-generated and human-reviewed tags
ALTER TABLE tickets ADD COLUMN tags TEXT;
ALTER TABLE tickets ADD COLUMN ai_suggested_tags TEXT;
ALTER TABLE tickets ADD COLUMN tags_reviewed_by TEXT;
ALTER TABLE tickets ADD COLUMN tags_reviewed_at TEXT;

