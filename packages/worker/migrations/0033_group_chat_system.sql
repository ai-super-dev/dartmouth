-- Migration: 0033_group_chat_system.sql
-- Description: Add Group Chat system for internal staff communication
-- Created: December 6, 2025
-- Version: 2.0 (Previous version rolled back due to database blocking)
-- Design: NO foreign key constraints to avoid blocking issues

-- ============================================================================
-- TABLE: group_chat_channels
-- Description: Stores chat channels (public, private, direct messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'public', -- public, private, direct
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  archived_by TEXT
);

-- Indexes for performance (simple, non-blocking)
CREATE INDEX IF NOT EXISTS idx_group_chat_channels_type ON group_chat_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_group_chat_channels_archived ON group_chat_channels(is_archived);
CREATE INDEX IF NOT EXISTS idx_group_chat_channels_created_at ON group_chat_channels(created_at);

-- ============================================================================
-- TABLE: group_chat_messages
-- Description: Stores chat messages with optional file attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, file, system
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_channel ON group_chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_sender ON group_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_deleted ON group_chat_messages(is_deleted);

-- ============================================================================
-- TABLE: group_chat_members
-- Description: Tracks channel memberships and roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_chat_members (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- admin, member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_read_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  left_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_chat_members_channel ON group_chat_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_staff ON group_chat_members(staff_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_active ON group_chat_members(is_active);

-- Unique constraint to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chat_members_unique ON group_chat_members(channel_id, staff_id) WHERE is_active = 1;

-- ============================================================================
-- TABLE: group_chat_read_receipts
-- Description: Tracks unread message counts per channel per staff member
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_chat_read_receipts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  last_read_message_id TEXT,
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  unread_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_chat_read_receipts_channel_staff ON group_chat_read_receipts(channel_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_read_receipts_staff ON group_chat_read_receipts(staff_id);

-- Unique constraint to ensure one receipt per channel per staff
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chat_read_receipts_unique ON group_chat_read_receipts(channel_id, staff_id);

-- ============================================================================
-- SEED DATA: Create default #general channel
-- ============================================================================

INSERT OR IGNORE INTO group_chat_channels (id, name, description, channel_type, created_by)
VALUES (
  'channel-general',
  'general',
  'General discussion for all staff members',
  'public',
  'system'
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 4
-- Indexes created: 13
-- Seed data: 1 default channel
-- Foreign keys: NONE (by design to avoid blocking)
-- ============================================================================

