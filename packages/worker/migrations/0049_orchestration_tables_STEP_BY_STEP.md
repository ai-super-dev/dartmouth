# Orchestration Tables Migration - Step by Step Guide

## Option 1: Run All at Once (Recommended) ✅

Copy and paste the **ENTIRE** content from `0049_orchestration_tables.sql` into D1 Studio and run it all at once. This is the recommended method.

---

## Option 2: Run Step by Step (If Option 1 Doesn't Work)

If D1 Studio doesn't allow running multiple statements at once, run them in this exact order:

### Step 1: Create All Tables (Run This First)

```sql
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
```

**Wait for success**, then run:

```sql
-- Agent Messages Table
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
```

**Wait for success**, then run:

```sql
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
```

**Wait for success**, then run:

```sql
-- Workflow Executions Table
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
```

---

### Step 2: Create All Indexes (Run After All Tables Are Created)

Once all 4 tables are created successfully, create the indexes:

```sql
-- Agent Registry Indexes
CREATE INDEX IF NOT EXISTS idx_agent_registry_type ON agent_registry(type);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON agent_registry(status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_health ON agent_registry(health_status);
```

**Wait for success**, then run:

```sql
-- Agent Messages Indexes
CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from ON agent_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_status ON agent_messages(status);
```

**Wait for success**, then run:

```sql
-- Workflows Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
```

**Wait for success**, then run:

```sql
-- Workflow Executions Index
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
```

---

## ⚠️ Important Notes

1. **Order Matters:** Tables MUST be created before indexes
2. **Wait for Success:** After each statement, wait to see "Executed 1/1" or success message before running the next
3. **Verify:** After completion, refresh the sidebar - you should see:
   - `agent_registry`
   - `agent_messages`
   - `workflows`
   - `workflow_executions`

---

## ✅ Verification

After completing all steps, verify by running:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agent_registry', 'agent_messages', 'workflows', 'workflow_executions');
```

You should see 4 rows returned.

---

## 🚨 If You Get Errors

- **"Table already exists"**: That's okay! The `IF NOT EXISTS` clause means it won't recreate it
- **"Index already exists"**: That's also okay! The `IF NOT EXISTS` clause handles this
- **"Table does not exist"**: You're trying to create an index before creating the table - make sure tables are created first!
