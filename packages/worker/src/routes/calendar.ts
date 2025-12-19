/**
 * Calendar API Routes (V2)
 * 
 * Provides calendar operations for ALL agents:
 * - List events
 * - Create events
 * - Update events
 * - Delete events
 */

import { Hono } from 'hono';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import { CalendarService } from '@agent-army/integration-services';

/**
 * Create Calendar router
 */
export function createCalendarRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Initialize service helper
  const getCalendarService = (env: Env) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('Google Calendar credentials not configured');
    }
    return new CalendarService({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/callback',
      refreshToken: env.GOOGLE_REFRESH_TOKEN
    });
  };

  /**
   * GET /api/v2/calendar/events
   * List calendar events
   */
  app.get('/api/v2/calendar/events', authenticateV2, async (c) => {
    try {
      const calendarService = getCalendarService(c.env);
      const { timeMin, timeMax, maxResults, calendarId, orderBy, query } = c.req.query();

      const events = await calendarService.listEvents({
        timeMin: timeMin || undefined,
        timeMax: timeMax || undefined,
        maxResults: maxResults ? parseInt(maxResults) : undefined,
        calendarId: calendarId || undefined,
        orderBy: (orderBy as 'startTime' | 'updated') || undefined,
        query: query || undefined
      });

      return c.json({ events });
    } catch (error) {
      console.error('Calendar list error:', error);
      return c.json({
        error: {
          code: 'CALENDAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list events'
        }
      }, 500);
    }
  });

  /**
   * GET /api/v2/calendar/events/:id
   * Get a single calendar event
   */
  app.get('/api/v2/calendar/events/:id', authenticateV2, async (c) => {
    try {
      const calendarService = getCalendarService(c.env);
      const eventId = c.req.param('id');
      const calendarId = c.req.query('calendarId') || 'primary';

      const event = await calendarService.getEvent(eventId, calendarId);

      return c.json({ event });
    } catch (error) {
      console.error('Calendar get error:', error);
      return c.json({
        error: {
          code: 'CALENDAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get event'
        }
      }, 500);
    }
  });

  /**
   * POST /api/v2/calendar/events
   * Create a new calendar event
   */
  app.post('/api/v2/calendar/events', authenticateV2, async (c) => {
    try {
      const calendarService = getCalendarService(c.env);
      const body = await c.req.json();

      const event = await calendarService.createEvent(body);

      return c.json({ event }, 201);
    } catch (error) {
      console.error('Calendar create error:', error);
      return c.json({
        error: {
          code: 'CALENDAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create event'
        }
      }, 500);
    }
  });

  /**
   * PUT /api/v2/calendar/events/:id
   * Update a calendar event
   */
  app.put('/api/v2/calendar/events/:id', authenticateV2, async (c) => {
    try {
      const calendarService = getCalendarService(c.env);
      const eventId = c.req.param('id');
      const body = await c.req.json();
      const calendarId = body.calendarId || 'primary';

      const event = await calendarService.updateEvent(eventId, body, calendarId);

      return c.json({ event });
    } catch (error) {
      console.error('Calendar update error:', error);
      return c.json({
        error: {
          code: 'CALENDAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update event'
        }
      }, 500);
    }
  });

  /**
   * DELETE /api/v2/calendar/events/:id
   * Delete a calendar event
   */
  app.delete('/api/v2/calendar/events/:id', authenticateV2, async (c) => {
    try {
      const calendarService = getCalendarService(c.env);
      const eventId = c.req.param('id');
      const calendarId = c.req.query('calendarId') || 'primary';

      await calendarService.deleteEvent(eventId, calendarId);

      return c.json({ success: true });
    } catch (error) {
      console.error('Calendar delete error:', error);
      return c.json({
        error: {
          code: 'CALENDAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete event'
        }
      }, 500);
    }
  });

  return app;
}

