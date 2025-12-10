-- Migration: Staff Memos System
-- Description: Personal notes for staff members with attachment support
-- Date: December 8, 2025

CREATE TABLE IF NOT EXISTS staff_memos (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memos_staff ON staff_memos(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memos_deleted ON staff_memos(is_deleted);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON staff_memos(created_at DESC);

