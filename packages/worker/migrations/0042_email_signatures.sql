-- Email Signatures Table
CREATE TABLE IF NOT EXISTS email_signatures (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  signature_html TEXT NOT NULL,
  is_default INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_signatures_staff ON email_signatures(staff_id);

-- Global signature setting (stored in KV, but we'll track it here for reference)
-- Default signature template that can be customized per staff member








