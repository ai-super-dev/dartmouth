/**
 * Orchestration Services API Controller
 */

import { Context } from 'hono';
import type { Env } from '../types/shared';
// Using relative path for workspace compatibility
// In production, this would be: import { AgentRegistry, AgentCommunication, WorkflowEngine, SwarmCoordinator } from '@agent-army/orchestration-services';
import { AgentRegistry } from '../../../orchestration-services/src/AgentRegistry';
import { AgentCommunication } from '../../../orchestration-services/src/AgentCommunication';
import { WorkflowEngine } from '../../../orchestration-services/src/WorkflowEngine';
import { SwarmCoordinator } from '../../../orchestration-services/src/SwarmCoordinator';

/**
 * GET /api/v2/agents/registry
 */
export async function listAgents(c: Context<{ Bindings: Env }>) {
  try {
    const { type, status, capability } = c.req.query();
    const registry = new AgentRegistry(c.env);
    
    const agents = await registry.listAgents({ type, status, capability });
    
    return c.json({ success: true, agents });
  } catch (error: any) {
    console.error('[Orchestration] Error listing agents:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * POST /api/v2/agents/register
 */
export async function registerAgent(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const registry = new AgentRegistry(c.env);
    
    const agent = await registry.registerAgent(body);
    
    return c.json({ success: true, agent });
  } catch (error: any) {
    console.error('[Orchestration] Error registering agent:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * GET /api/v2/agents/:id/status
 */
export async function getAgentStatus(c: Context<{ Bindings: Env }>) {
  try {
    const { id } = c.req.param();
    const registry = new AgentRegistry(c.env);
    
    const agent = await registry.getAgent(id);
    
    if (!agent) {
      return c.json({ success: false, error: 'Agent not found' }, 404);
    }
    
    return c.json({ success: true, agent });
  } catch (error: any) {
    console.error('[Orchestration] Error getting agent status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * POST /api/v2/agents/invoke
 */
export async function invokeAgent(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const communication = new AgentCommunication(c.env);
    
    const result = await communication.invokeAgent(body);
    
    return c.json({ success: true, result });
  } catch (error: any) {
    console.error('[Orchestration] Error invoking agent:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * POST /api/v2/workflow/create
 */
export async function createWorkflow(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const engine = new WorkflowEngine(c.env);
    
    const workflow = await engine.createWorkflow(body);
    
    return c.json({ success: true, workflow });
  } catch (error: any) {
    console.error('[Orchestration] Error creating workflow:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * POST /api/v2/workflow/execute
 */
export async function executeWorkflow(c: Context<{ Bindings: Env }>) {
  try {
    const { workflowId } = await c.req.json();
    const engine = new WorkflowEngine(c.env);
    
    const workflow = await engine.executeWorkflow(workflowId);
    
    return c.json({ success: true, workflow });
  } catch (error: any) {
    console.error('[Orchestration] Error executing workflow:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * POST /api/v2/swarm/coordinate
 */
export async function coordinateSwarm(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const coordinator = new SwarmCoordinator(c.env);
    
    const swarmTask = await coordinator.coordinateSwarm(body);
    
    return c.json({ success: true, swarmTask });
  } catch (error: any) {
    console.error('[Orchestration] Error coordinating swarm:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * GET /api/v2/orchestration/health
 */
export async function health(c: Context<{ Bindings: Env }>) {
  try {
    const registry = new AgentRegistry(c.env);
    const agents = await registry.listAgents();
    
    return c.json({
      success: true,
      status: 'healthy',
      services: {
        agentRegistry: 'operational',
        agentCommunication: 'operational',
        workflowEngine: 'operational',
        swarmCoordinator: 'operational',
      },
      stats: {
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === 'active').length,
      },
    });
  } catch (error: any) {
    console.error('[Orchestration] Health check error:', error);
    return c.json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    }, 500);
  }
}

/**
 * POST /api/v2/agents/messages/:messageId/complete (TEST ONLY)
 * Manually complete a message for testing purposes
 */
export async function completeMessageForTesting(c: Context<{ Bindings: Env }>) {
  try {
    const { messageId } = c.req.param();
    const body = await c.req.json();
    const { response } = body;

    const communication = new AgentCommunication(c.env);
    
    // Update message status to completed manually
    const now = Date.now();
    await c.env.DB.prepare(`
      UPDATE agent_messages 
      SET status = 'completed', response = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(response || { success: true, message: 'Test response' }),
      now,
      messageId
    ).run();

    return c.json({
      success: true,
      message: 'Message completed for testing',
      messageId,
    });
  } catch (error: any) {
    console.error('[Orchestration] Complete message error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}
