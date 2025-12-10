-- Add was_scheduled flag to ticket_messages
-- This allows us to show a clock icon for messages that were originally scheduled

ALTER TABLE ticket_messages ADD COLUMN was_scheduled BOOLEAN DEFAULT FALSE;

