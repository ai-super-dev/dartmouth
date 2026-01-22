-- Orchestration Services Tables
-- Agent Registry, Communication, Workflows, and Swarm Coordination

-- Agent Registry Table
CREATE TABLE IF NOT EXISTS agent_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  capabilities TEXT, -- JSON array of capabilities
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, error
  health_status TEXT DEFAULT 'healthy', -- healthy, degraded, unhealthy
  version TEXT,
  endpoint_url TEXT,
  metadata TEXT, -- JSON object
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
  message_type TEXT NOT NULL, -- task, query, response, notification
  content TEXT NOT NULL, -- JSON message payload
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  response TEXT, -- Response from target agent
  error TEXT, -- Error message if failed
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
  steps TEXT NOT NULL, -- JSON array of workflow steps
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, paused
  input_data TEXT, -- JSON initial input
  output_data TEXT, -- JSON final output
  error TEXT,
  created_by TEXT, -- Agent or user ID
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
  agent_id TEXT, -- Agent that executed this step
  status TEXT NOT NULL DEFAULT 'pending',
  input_data TEXT,
  output_data TEXT,
  error TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
