-- Migration 0045: Add escalation fields to tickets table
-- Date: 2025-12-09
-- Purpose: Track task escalation level and last escalation time

ALTER TABLE tickets ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN last_escalated_at TEXT;

