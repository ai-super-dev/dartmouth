-- Add edit and delete tracking columns to internal_notes table

ALTER TABLE internal_notes ADD COLUMN edited_at TEXT;
ALTER TABLE internal_notes ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE internal_notes ADD COLUMN deleted_at TEXT;
ALTER TABLE internal_notes ADD COLUMN deleted_by TEXT;

-- Add index for filtering deleted notes
CREATE INDEX IF NOT EXISTS idx_internal_notes_is_deleted ON internal_notes(is_deleted);

