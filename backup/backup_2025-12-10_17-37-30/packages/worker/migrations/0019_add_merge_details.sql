-- Migration 0019: Add merge details fields to tickets
-- Date: 2025-12-03
-- Purpose: Track when and who merged tickets

-- Add columns for merge details (will error if already exists - that's OK)
ALTER TABLE tickets ADD COLUMN merged_at DATETIME DEFAULT NULL;
ALTER TABLE tickets ADD COLUMN merged_by TEXT DEFAULT NULL;

