-- Migration 0043: Add related_ticket_id field to tickets
-- Date: 2025-12-09
-- Purpose: Link tasks to their related parent tickets

-- Add related_ticket_id column
ALTER TABLE tickets ADD COLUMN related_ticket_id TEXT;

-- Create index for finding related tickets
CREATE INDEX IF NOT EXISTS idx_tickets_related ON tickets(related_ticket_id) WHERE related_ticket_id IS NOT NULL;

