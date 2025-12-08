-- Add attachment support to ticket_messages and internal_notes
-- Migration: 0006_add_attachments.sql

-- Add attachment columns to ticket_messages
ALTER TABLE ticket_messages ADD COLUMN attachment_url TEXT;
ALTER TABLE ticket_messages ADD COLUMN attachment_name TEXT;
ALTER TABLE ticket_messages ADD COLUMN attachment_type TEXT;
ALTER TABLE ticket_messages ADD COLUMN attachment_size INTEGER;

-- Add attachment columns to internal_notes
ALTER TABLE internal_notes ADD COLUMN attachment_url TEXT;
ALTER TABLE internal_notes ADD COLUMN attachment_name TEXT;
ALTER TABLE internal_notes ADD COLUMN attachment_type TEXT;
ALTER TABLE internal_notes ADD COLUMN attachment_size INTEGER;

-- Add attachment columns to chat_messages
ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT;
ALTER TABLE chat_messages ADD COLUMN attachment_name TEXT;
ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT;
ALTER TABLE chat_messages ADD COLUMN attachment_size INTEGER;

