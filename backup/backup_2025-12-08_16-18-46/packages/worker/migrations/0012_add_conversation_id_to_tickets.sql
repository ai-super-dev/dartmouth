-- Add conversation_id column to tickets table to link with Email System V2
ALTER TABLE tickets ADD COLUMN conversation_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_conversation_id ON tickets(conversation_id);

