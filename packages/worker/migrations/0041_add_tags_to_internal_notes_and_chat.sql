-- Add tags column to internal_notes table
ALTER TABLE internal_notes ADD COLUMN tags TEXT;

-- Add tags column to chat_messages table (Live Chat)
ALTER TABLE chat_messages ADD COLUMN tags TEXT;







