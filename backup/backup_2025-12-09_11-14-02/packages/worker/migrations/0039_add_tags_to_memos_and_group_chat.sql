-- Add tags column to staff_memos and group_chat_messages for tagging and search

ALTER TABLE staff_memos ADD COLUMN tags TEXT;
ALTER TABLE group_chat_messages ADD COLUMN tags TEXT;

-- Add indexes for tag search
CREATE INDEX IF NOT EXISTS idx_staff_memos_tags ON staff_memos(tags);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_tags ON group_chat_messages(tags);

