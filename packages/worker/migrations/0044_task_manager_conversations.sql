-- Task Manager AI Conversations
-- Enables staff to chat with the Task Manager AI assistant

-- Task Manager conversations with staff
CREATE TABLE IF NOT EXISTS task_manager_conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  title TEXT, -- Auto-generated or user-provided title
  context_type TEXT, -- 'general', 'task', 'project'
  context_id TEXT, -- task_id if discussing specific task
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (context_id) REFERENCES tasks(id)
);

-- Messages in Task Manager conversations
CREATE TABLE IF NOT EXISTS task_manager_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'staff' or 'task_manager_ai'
  sender_id TEXT, -- staff_id if sender_type is 'staff'
  content TEXT NOT NULL,
  action_type TEXT, -- 'message', 'task_created', 'task_updated', 'task_assigned', etc.
  action_data TEXT, -- JSON with action details
  metadata TEXT, -- JSON with additional context (confidence, sources, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES task_manager_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES staff(id)
);

-- Task Manager AI actions log (for tracking what the AI does)
CREATE TABLE IF NOT EXISTS task_manager_actions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'create_task', 'update_task', 'assign_task', 'search_tasks', etc.
  action_data TEXT NOT NULL, -- JSON with action details
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  result TEXT, -- JSON with action result
  requires_confirmation INTEGER DEFAULT 0,
  confirmed_by TEXT, -- staff_id who confirmed
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES task_manager_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES task_manager_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by) REFERENCES staff(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tm_conversations_tenant ON task_manager_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tm_conversations_staff ON task_manager_conversations(staff_id);
CREATE INDEX IF NOT EXISTS idx_tm_conversations_context ON task_manager_conversations(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_tm_messages_conversation ON task_manager_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tm_messages_created ON task_manager_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tm_actions_conversation ON task_manager_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tm_actions_status ON task_manager_actions(status);

