-- Orchestration Services Tables
-- Agent Registry, Communication, Workflows, and Swarm Coordination
-- IMPORTANT: Run this ENTIRE file at once, do not run parts separately

-- Agent Registry Table
CREATE TABLE IF NOT EXISTS agent_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  capabilities TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT DEFAULT 'healthy',
  version TEXT,
  endpoint_url TEXT,
  metadata TEXT,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_registry_type ON agent_registry(type);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON agent_registry(status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_health ON agent_registry(health_status);

-- Agent Messages Table (for inter-agent communication)
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from ON agent_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_status ON agent_messages(status);

-- Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data TEXT,
  output_data TEXT,
  error TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);

-- Workflow Steps Execution Log
CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data TEXT,
  output_data TEXT,
  error TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
