-- Tasks System Migration
-- Creates tables for internal task management

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  due_date TEXT,
  completed_at TEXT,
  channel_id TEXT, -- Group chat channel to notify
  related_ticket_id TEXT, -- Optional link to a ticket
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  FOREIGN KEY (assigned_to) REFERENCES staff(id),
  FOREIGN KEY (related_ticket_id) REFERENCES tickets(id)
);

-- Task mentions (for @mentions in task notifications)
CREATE TABLE IF NOT EXISTS task_mentions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  mention_type TEXT NOT NULL DEFAULT 'direct', -- direct, @all, @managers, @admins
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  action TEXT NOT NULL, -- created, updated, assigned, completed, commented, etc.
  details TEXT, -- JSON with change details
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_related_ticket ON tasks(related_ticket_id);
CREATE INDEX IF NOT EXISTS idx_task_mentions_task ON task_mentions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_mentions_staff ON task_mentions(staff_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);

