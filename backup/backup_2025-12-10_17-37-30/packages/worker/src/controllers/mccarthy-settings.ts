/**
 * McCarthy AI Agent Settings Controller
 * Handles configuration for the McCarthy AI agent
 */

import { Context } from 'hono';
import type { Env } from '../types/shared';
import type { AuthUser } from '../middleware/auth';

const MCCARTHY_AGENT_ID = 'ai-agent-001';

/**
 * GET /api/settings/mccarthy
 * Get McCarthy AI agent configuration
 */
export async function getMcCarthySettings(c: Context<{ Bindings: Env }>) {
  try {
    const config = await c.env.DB
      .prepare('SELECT * FROM agent_configs WHERE agent_id = ?')
      .bind(MCCARTHY_AGENT_ID)
      .first<any>();

    if (!config) {
      // Return default config if not found
      return c.json({
        agent_id: MCCARTHY_AGENT_ID,
        name: 'McCarthy AI',
        llm_provider: 'openai',
        llm_model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 2000
      });
    }

    return c.json({
      agent_id: config.agent_id,
      name: config.name,
      llm_provider: config.llm_provider,
      llm_model: config.llm_model,
      temperature: config.temperature,
      max_tokens: config.max_tokens
    });
  } catch (error) {
    console.error('[McCarthySettings] Get error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * PUT /api/settings/mccarthy
 * Update McCarthy AI agent configuration
 */
export async function updateMcCarthySettings(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;

    // Only admins can update settings
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const { llm_provider, llm_model, temperature, max_tokens } = body;

    // Validate inputs
    if (llm_provider && !['openai', 'anthropic'].includes(llm_provider)) {
      return c.json({ error: 'Invalid LLM provider' }, 400);
    }

    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return c.json({ error: 'Temperature must be between 0 and 2' }, 400);
    }

    if (max_tokens !== undefined && (max_tokens < 100 || max_tokens > 16000)) {
      return c.json({ error: 'Max tokens must be between 100 and 16000' }, 400);
    }

    const now = new Date().toISOString();

    // Check if config exists
    const existing = await c.env.DB
      .prepare('SELECT agent_id FROM agent_configs WHERE agent_id = ?')
      .bind(MCCARTHY_AGENT_ID)
      .first();

    if (existing) {
      // Update existing config
      await c.env.DB
        .prepare(
          `UPDATE agent_configs 
           SET llm_provider = ?, llm_model = ?, temperature = ?, max_tokens = ?, updated_at = ?
           WHERE agent_id = ?`
        )
        .bind(
          llm_provider || 'openai',
          llm_model || 'gpt-4o',
          temperature ?? 0.7,
          max_tokens ?? 2000,
          now,
          MCCARTHY_AGENT_ID
        )
        .run();
    } else {
      // Insert new config
      await c.env.DB
        .prepare(
          `INSERT INTO agent_configs (agent_id, name, version, llm_provider, llm_model, temperature, max_tokens, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          MCCARTHY_AGENT_ID,
          'McCarthy AI',
          '1.0.0',
          llm_provider || 'openai',
          llm_model || 'gpt-4o',
          temperature ?? 0.7,
          max_tokens ?? 2000,
          now,
          now
        )
        .run();
    }

    console.log(`[McCarthySettings] Settings updated by ${user.email}`);

    return c.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('[McCarthySettings] Update error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

