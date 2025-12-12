-- MEMORY AND RAG TABLES - CLEAN VERSION FOR CLOUDFLARE DASHBOARD
-- Copy and paste this entire file into Cloudflare D1 Console

-- Create semantic_memory table
CREATE TABLE IF NOT EXISTS semantic_memory (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  confidence REAL DEFAULT 1.0,
  source_session_id TEXT,
  metadata TEXT,
  learned_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_agent_id ON semantic_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_category ON semantic_memory(category);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_learned_at ON semantic_memory(learned_at);

-- Create episodic_memory table
CREATE TABLE IF NOT EXISTS episodic_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id TEXT,
  summary TEXT NOT NULL,
  event_type TEXT,
  importance REAL DEFAULT 0.5,
  metadata TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_episodic_memory_user_id ON episodic_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_agent_id ON episodic_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_session_id ON episodic_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_occurred_at ON episodic_memory(occurred_at);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_importance ON episodic_memory(importance);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  agent_id TEXT,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing', 'ready', 'failed', 'archived')),
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_agent_id ON documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Create rag_chunks table (without inline comment to avoid parsing issues)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON rag_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_agent_id ON rag_chunks(agent_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_chunk_index ON rag_chunks(chunk_index);

