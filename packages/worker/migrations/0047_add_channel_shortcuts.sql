-- Migration 0047: Add channel shortcuts for group chat channels
-- Date: 2025-12-09
-- Purpose: Add shortcut field for channels (#customerservice, #task, #general)

ALTER TABLE group_chat_channels ADD COLUMN shortcut TEXT;

-- Set shortcuts for existing channels
UPDATE group_chat_channels SET shortcut = 'general' WHERE name = 'general';
UPDATE group_chat_channels SET shortcut = 'task' WHERE name = 'task';
UPDATE group_chat_channels SET shortcut = 'customerservice' WHERE name = 'customer-service';

