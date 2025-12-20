/**
 * CalendarService - Google Calendar Integration
 * 
 * Provides calendar operations for ANY agent:
 * - PA Agent: Personal/family calendar management
 * - Customer Service: Appointment booking
 * - Other agents: Event scheduling
 * 
 * @example
 * ```typescript
 * const calendarService = new CalendarService(config);
 * const events = await calendarService.listEvents({
 *   timeMin: '2025-12-01T00:00:00Z',
 *   timeMax: '2025-12-31T23:59:59Z'
 * });
 * ```
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type {
  CalendarEvent,
  CalendarListOptions,
  CalendarServiceConfig
} from './types';

export class CalendarService {
  private calendar: ReturnType<typeof google.calendar>;
  private oauth2Client: OAuth2Client;

  constructor(config: CalendarServiceConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * List calendar events
   * @param options - List options (date range, max results)
   * @returns Array of calendar events
   */
  async listEvents(options: CalendarListOptions = {}): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: options.calendarId || 'primary',
        timeMin: options.timeMin || new Date().toISOString(),
        timeMax: options.timeMax,
        maxResults: options.maxResults || 100,
        singleEvents: true,
        orderBy: options.orderBy || 'startTime',
        q: options.query
      });

      return (response.data.items || []).map(item => this.mapGoogleEventToCalendarEvent(item));
    } catch (error) {
      console.error('Failed to list calendar events:', error);
      throw new Error(`Calendar list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single calendar event
   * @param eventId - Event ID
   * @param calendarId - Calendar ID (default: 'primary')
   * @returns Calendar event
   */
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId
      });

      return this.mapGoogleEventToCalendarEvent(response.data);
    } catch (error) {
      console.error('Failed to get calendar event:', error);
      throw new Error(`Calendar get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new calendar event
   * @param event - Event details
   * @returns Created event
   */
  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    // Validate required fields
    if (!event.title) {
      throw new Error('Event title is required');
    }
    if (!event.start || !event.end) {
      throw new Error('Event start and end times are required');
    }

    try {
      const googleEvent = this.mapCalendarEventToGoogleEvent(event);
      const response = await this.calendar.events.insert({
        calendarId: event.calendarId || 'primary',
        requestBody: googleEvent
      });

      return this.mapGoogleEventToCalendarEvent(response.data);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw new Error(`Calendar create failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing calendar event
   * @param eventId - Event ID
   * @param event - Updated event details
   * @param calendarId - Calendar ID (default: 'primary')
   * @returns Updated event
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId: string = 'primary'): Promise<CalendarEvent> {
    try {
      // First get the existing event to merge changes
      const existing = await this.getEvent(eventId, calendarId);
      const mergedEvent: CalendarEvent = {
        ...existing,
        ...event,
        id: eventId
      };

      const googleEvent = this.mapCalendarEventToGoogleEvent(mergedEvent);
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: googleEvent
      });

      return this.mapGoogleEventToCalendarEvent(response.data);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw new Error(`Calendar update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   * @param eventId - Event ID
   * @param calendarId - Calendar ID (default: 'primary')
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw new Error(`Calendar delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map Google Calendar event to our CalendarEvent type
   */
  private mapGoogleEventToCalendarEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary || '',
      description: googleEvent.description || '',
      start: googleEvent.start?.dateTime || googleEvent.start?.date || '',
      end: googleEvent.end?.dateTime || googleEvent.end?.date || '',
      location: googleEvent.location || '',
      attendees: googleEvent.attendees?.map((a: any) => a.email) || [],
      reminders: googleEvent.reminders?.overrides?.map((r: any) => ({
        method: r.method as 'email' | 'popup' | 'sms',
        minutes: r.minutes
      })) || [],
      recurrence: googleEvent.recurrence?.[0] || undefined,
      timezone: googleEvent.start?.timeZone || googleEvent.end?.timeZone,
      allDay: !googleEvent.start?.dateTime && !!googleEvent.start?.date,
      status: googleEvent.status as 'confirmed' | 'tentative' | 'cancelled' | undefined
    };
  }

  /**
   * Map our CalendarEvent to Google Calendar event format
   */
  private mapCalendarEventToGoogleEvent(event: CalendarEvent): any {
    const isAllDay = event.allDay || false;
    const timezone = event.timezone || 'UTC';

    const googleEvent: any = {
      summary: event.title,
      description: event.description,
      location: event.location
    };

    if (isAllDay) {
      googleEvent.start = {
        date: event.start.split('T')[0],
        timeZone: timezone
      };
      googleEvent.end = {
        date: event.end.split('T')[0],
        timeZone: timezone
      };
    } else {
      googleEvent.start = {
        dateTime: event.start,
        timeZone: timezone
      };
      googleEvent.end = {
        dateTime: event.end,
        timeZone: timezone
      };
    }

    if (event.attendees && event.attendees.length > 0) {
      googleEvent.attendees = event.attendees.map(email => ({ email }));
    }

    if (event.reminders && event.reminders.length > 0) {
      googleEvent.reminders = {
        useDefault: false,
        overrides: event.reminders.map(r => ({
          method: r.method,
          minutes: r.minutes
        }))
      };
    }

    if (event.recurrence) {
      googleEvent.recurrence = [event.recurrence];
    }

    if (event.status) {
      googleEvent.status = event.status;
    }

    return googleEvent;
  }

  /**
   * Check health of Calendar service
   */
  async checkHealth(): Promise<'operational' | 'degraded' | 'down'> {
    try {
      await this.calendar.calendarList.list({ maxResults: 1 });
      return 'operational';
    } catch {
      return 'down';
    }
  }
}

