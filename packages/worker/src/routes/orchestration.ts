/**
 * Orchestration Services V2 API Routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import * as orchestrationController from '../controllers/orchestration';

export function createOrchestrationRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Enable CORS
  app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Type'],
    credentials: false,
  }));

  // ========================================================================
  // ORCHESTRATION SERVICES ROUTES
  // ========================================================================

  // Agent Registry
  app.get('/api/v2/agents/registry', authenticateV2, orchestrationController.listAgents);
  app.post('/api/v2/agents/register', authenticateV2, orchestrationController.registerAgent);
  app.get('/api/v2/agents/:id/status', authenticateV2, orchestrationController.getAgentStatus);

  // Agent Communication
  app.post('/api/v2/agents/invoke', authenticateV2, orchestrationController.invokeAgent);

  // Workflow Engine
  app.post('/api/v2/workflow/create', authenticateV2, orchestrationController.createWorkflow);
  app.post('/api/v2/workflow/execute', authenticateV2, orchestrationController.executeWorkflow);

  // Swarm Coordinator
  app.post('/api/v2/swarm/coordinate', authenticateV2, orchestrationController.coordinateSwarm);

  // Health Check (no auth required)
  app.get('/api/v2/orchestration/health', orchestrationController.health);

  // Test endpoint for completing messages (testing only)
  app.post('/api/v2/agents/messages/:messageId/complete', authenticateV2, orchestrationController.completeMessageForTesting);

  return app;
}
