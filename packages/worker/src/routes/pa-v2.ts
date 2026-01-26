/**
 * PA Agent V2 API Routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import * as paV2Controller from '../controllers/pa-v2';

export function createPAV2Router() {
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
  // PA AGENT V2 ROUTES
  // ========================================================================

  // PA Chat (V2)
  app.post('/api/v2/pa/chat', authenticateV2, paV2Controller.chat);

  return app;
}
