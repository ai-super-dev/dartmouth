-- Migration: Add archive support to mentions
-- Description: Add is_archived and archived_at fields
-- Date: December 8, 2025

ALTER TABLE mentions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentions ADD COLUMN archived_at TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_mentions_archived ON mentions(is_archived, archived_at DESC);

