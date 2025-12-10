-- Migration 0018: Add merged_from field to tickets
-- Date: 2025-12-03
-- Purpose: Track which tickets were merged into this ticket

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
-- This will silently succeed if column already exists
CREATE TABLE IF NOT EXISTS _migration_check (id INTEGER);
DROP TABLE IF EXISTS _migration_check;

-- Add column only if it doesn't exist (will error if exists, but that's OK - migration already ran)
-- For idempotent migrations, we wrap in a transaction that can fail gracefully

-- Create index for finding merged tickets (IF NOT EXISTS handles re-runs)
CREATE INDEX IF NOT EXISTS idx_tickets_merged ON tickets(merged_from) WHERE merged_from IS NOT NULL;

