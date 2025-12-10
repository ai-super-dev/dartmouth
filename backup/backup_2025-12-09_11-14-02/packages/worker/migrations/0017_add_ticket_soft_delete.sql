-- Migration 0017: Add Soft Delete for Tickets
-- Date: 2025-12-03
-- Purpose: Add deleted_at and deleted_by columns for soft delete functionality

-- Add soft delete columns to tickets table
ALTER TABLE tickets ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE tickets ADD COLUMN deleted_by TEXT DEFAULT NULL;

-- Add index for filtering out deleted tickets
CREATE INDEX IF NOT EXISTS idx_tickets_deleted ON tickets(deleted_at) WHERE deleted_at IS NULL;

-- Foreign key for deleted_by
-- Note: SQLite doesn't support adding foreign keys to existing tables, so this is just for documentation
-- FOREIGN KEY (deleted_by) REFERENCES staff_users(id)

