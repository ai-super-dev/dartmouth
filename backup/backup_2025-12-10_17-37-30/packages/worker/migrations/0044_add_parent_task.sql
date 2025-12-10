-- Migration 0044: Add parent_task_id for sub-tasks
-- Date: 2025-12-09
-- Purpose: Enable parent/child task relationships

-- Add parent_task_id column to link sub-tasks to parent tasks
ALTER TABLE tickets ADD COLUMN parent_task_id TEXT;

-- Create index for finding sub-tasks
CREATE INDEX IF NOT EXISTS idx_tickets_parent_task ON tickets(parent_task_id) WHERE parent_task_id IS NOT NULL;

