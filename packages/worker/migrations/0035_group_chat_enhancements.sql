-- ============================================================================
-- MIGRATION 0035: Group Chat Enhancements
-- ============================================================================
-- Created: December 6, 2025, 9:00 AM AEST
-- Purpose: Add message editing, deletion, emoji reactions, and settings
-- ============================================================================

-- Add edited_by column to track who edited the message
ALTER TABLE group_chat_messages ADD COLUMN edited_by TEXT;

-- Add reactions column to store emoji reactions (JSON format)
ALTER TABLE group_chat_messages ADD COLUMN reactions TEXT DEFAULT '[]';

-- Add channel settings columns
ALTER TABLE group_chat_channels ADD COLUMN allow_message_editing INTEGER DEFAULT 1;
ALTER TABLE group_chat_channels ADD COLUMN allow_message_deletion INTEGER DEFAULT 1;
ALTER TABLE group_chat_channels ADD COLUMN allow_file_deletion INTEGER DEFAULT 1;






