/**
 * Email API Routes (V2)
 * 
 * Provides email operations for ALL agents:
 * - List messages
 * - Send emails
 * - Create drafts
 */

import { Hono } from 'hono';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import { EmailService } from '@agent-army/integration-services';

/**
 * Create Email router
 */
export function createEmailRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Initialize service helper
  const getEmailService = (env: Env) => {
    if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
      throw new Error('Gmail credentials not configured');
    }
    return new EmailService({
      provider: 'gmail',
      clientId: env.GMAIL_CLIENT_ID,
      clientSecret: env.GMAIL_CLIENT_SECRET,
      refreshToken: env.GMAIL_REFRESH_TOKEN
    });
  };

  /**
   * GET /api/v2/email/messages
   * List email messages
   */
  app.get('/api/v2/email/messages', authenticateV2, async (c) => {
    try {
      const emailService = getEmailService(c.env);
      const { folder, maxResults, query, unreadOnly, pageToken } = c.req.query();

      const messages = await emailService.listMessages({
        folder: folder as 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' || undefined,
        maxResults: maxResults ? parseInt(maxResults) : undefined,
        query: query || undefined,
        unreadOnly: unreadOnly === 'true',
        pageToken: pageToken || undefined
      });

      return c.json({ messages });
    } catch (error) {
      console.error('Email list error:', error);
      return c.json({
        error: {
          code: 'EMAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list messages'
        }
      }, 500);
    }
  });

  /**
   * POST /api/v2/email/send
   * Send an email
   */
  app.post('/api/v2/email/send', authenticateV2, async (c) => {
    try {
      const emailService = getEmailService(c.env);
      const body = await c.req.json();

      const result = await emailService.send(body);

      return c.json(result, 201);
    } catch (error) {
      console.error('Email send error:', error);
      return c.json({
        error: {
          code: 'EMAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send email'
        }
      }, 500);
    }
  });

  /**
   * POST /api/v2/email/draft
   * Create a draft email
   */
  app.post('/api/v2/email/draft', authenticateV2, async (c) => {
    try {
      const emailService = getEmailService(c.env);
      const body = await c.req.json();

      const result = await emailService.createDraft(body);

      return c.json(result, 201);
    } catch (error) {
      console.error('Email draft error:', error);
      return c.json({
        error: {
          code: 'EMAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create draft'
        }
      }, 500);
    }
  });

  return app;
}

