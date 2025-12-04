-- Migration for Auto-Assignment System
-- Hybrid model: auto-assign with smart caps during business hours

-- Auto-assignment configuration table
CREATE TABLE IF NOT EXISTS auto_assignment_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 0, -- 0 = disabled, 1 = enabled
  max_assigned_tickets INTEGER NOT NULL DEFAULT 8, -- Max tickets auto-assigned per staff
  refill_threshold INTEGER NOT NULL DEFAULT 3, -- When to auto-assign more
  priority_order TEXT NOT NULL DEFAULT 'priority_first', -- 'priority_first', 'oldest_first', 'newest_first'
  channels TEXT NOT NULL DEFAULT 'email,chat', -- Comma-separated: 'email', 'chat', 'phone'
  business_hours_only INTEGER NOT NULL DEFAULT 1, -- Only auto-assign during business hours
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default config
INSERT OR IGNORE INTO auto_assignment_config (id) VALUES ('default');

-- Per-staff auto-assignment settings
ALTER TABLE staff_users ADD COLUMN auto_assign_enabled INTEGER DEFAULT 1; -- 1 = can receive auto-assigned tickets
ALTER TABLE staff_users ADD COLUMN auto_assign_max INTEGER DEFAULT NULL; -- Override global max (NULL = use global)
ALTER TABLE staff_users ADD COLUMN auto_assign_channels TEXT DEFAULT NULL; -- Override channels (NULL = use global)

-- Auto-assignment audit log
CREATE TABLE IF NOT EXISTS auto_assignment_log (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  ticket_number TEXT,
  assigned_to TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT, -- 'auto_refill', 'initial_assignment', 'round_robin'
  staff_ticket_count INTEGER, -- How many tickets staff had at time of assignment
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  FOREIGN KEY (assigned_to) REFERENCES staff_users(id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_assigned_to ON auto_assignment_log(assigned_to);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_assigned_at ON auto_assignment_log(assigned_at);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_ticket_id ON auto_assignment_log(ticket_id);

-- Trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_auto_assignment_config_updated_at
AFTER UPDATE ON auto_assignment_config
FOR EACH ROW
BEGIN
  UPDATE auto_assignment_config SET updated_at = datetime('now') WHERE id = NEW.id;
END;

