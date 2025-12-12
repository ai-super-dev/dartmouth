/**
 * Voice Services V2 API Routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import * as voiceController from '../controllers/voice';

export function createVoiceRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Enable CORS
  app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Type'],
    credentials: false,
  }));

  // Note: Debug middleware removed for production
  // If needed for development, uncomment:
  // app.use('/*', async (c, next) => {
  //   console.log('[Voice Router] Request:', c.req.method, c.req.url);
  //   await next();
  // });

  // ========================================================================
  // VOICE SERVICES ROUTES
  // ========================================================================

  // Speech-to-Text
  app.post('/api/v2/voice/stt', authenticateV2, voiceController.speechToText);

  // Text-to-Speech
  app.post('/api/v2/voice/tts', authenticateV2, voiceController.textToSpeech);

  // Audio Streaming
  app.post('/api/v2/voice/stream', authenticateV2, voiceController.stream);

  // Voice Activity Detection
  app.post('/api/v2/voice/vad', authenticateV2, voiceController.detectVoiceActivity);

  // Interrupt Handling
  app.post('/api/v2/voice/interrupt', authenticateV2, voiceController.handleInterrupt);

  // Health Check (no auth required)
  app.get('/api/v2/voice/health', voiceController.health);

  return app;
}

