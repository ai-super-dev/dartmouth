-- Migration 0016: Update AI Agent Name to McCarthy AI
-- Date: 2025-12-02
-- Purpose: Change AI agent display name from "AI Assistant" to "McCarthy AI"

UPDATE staff_users
SET 
  first_name = 'McCarthy',
  last_name = 'AI',
  updated_at = datetime('now')
WHERE id = 'ai-agent-001';

