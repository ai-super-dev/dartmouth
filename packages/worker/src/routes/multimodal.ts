/**
 * Multi-Modal Services V2 API Routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import * as multimodalController from '../controllers/multimodal';

export function createMultimodalRouter() {
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
  // MULTI-MODAL SERVICES ROUTES
  // ========================================================================

  // Vision Analysis
  app.post('/api/v2/vision/analyze', authenticateV2, multimodalController.analyzeVision);

  // Document Parsing
  app.post('/api/v2/document/parse', authenticateV2, multimodalController.parseDocument);

  // Audio Analysis
  app.post('/api/v2/audio/analyze', authenticateV2, multimodalController.analyzeAudio);

  // Multi-Modal Context Fusion
  app.post('/api/v2/multimodal/context', authenticateV2, multimodalController.buildMultiModalContext);

  // Health Check (no auth required)
  app.get('/api/v2/multimodal/health', multimodalController.health);

  return app;
}
