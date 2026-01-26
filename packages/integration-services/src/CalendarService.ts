/**
 * CalendarService - Google Calendar Integration (Cloudflare Workers Compatible)
 * 
 * Provides calendar operations for ANY agent:
 * - PA Agent: Personal/family calendar management
 * - Customer Service: Appointment booking
 * - Other agents: Event scheduling
 * 
 * Uses Google Calendar REST API directly (no googleapis dependency)
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

import type {
  CalendarEvent,
  CalendarListOptions,
  CalendarServiceConfig
} from './types';

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup' | 'sms';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class CalendarService {
  private config: CalendarServiceConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly API_BASE = 'https://www.googleapis.com/calendar/v3';

  constructor(config: CalendarServiceConfig) {
    this.config = config;
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    // Refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List calendar events
   * @param options - List options (date range, max results)
   * @returns Array of calendar events
   */
  async listEvents(options: CalendarListOptions = {}): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams();
      params.set('calendarId', options.calendarId || 'primary');
      if (options.timeMin) params.set('timeMin', options.timeMin);
      if (options.timeMax) params.set('timeMax', options.timeMax);
      params.set('maxResults', String(options.maxResults || 100));
      params.set('singleEvents', 'true');
      params.set('orderBy', options.orderBy || 'startTime');
      if (options.query) params.set('q', options.query);
      if (options.showDeleted) params.set('showDeleted', 'true');

      const response = await this.apiRequest<{ items?: GoogleCalendarEvent[] }>(
        `/calendars/${options.calendarId || 'primary'}/events?${params.toString()}`
      );

      return (response.items || []).map(item => this.mapGoogleEventToCalendarEvent(item));
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
      const response = await this.apiRequest<GoogleCalendarEvent>(
        `/calendars/${calendarId}/events/${eventId}`
      );

      return this.mapGoogleEventToCalendarEvent(response);
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
      const response = await this.apiRequest<GoogleCalendarEvent>(
        `/calendars/${event.calendarId || 'primary'}/events`,
        {
          method: 'POST',
          body: JSON.stringify(googleEvent),
        }
      );

      return this.mapGoogleEventToCalendarEvent(response);
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
      const response = await this.apiRequest<GoogleCalendarEvent>(
        `/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          body: JSON.stringify(googleEvent),
        }
      );

      return this.mapGoogleEventToCalendarEvent(response);
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
      await this.apiRequest<void>(
        `/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
        }
      );
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw new Error(`Calendar delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map Google Calendar event to our CalendarEvent type
   */
  private mapGoogleEventToCalendarEvent(googleEvent: GoogleCalendarEvent): CalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary || '',
      description: googleEvent.description || '',
      start: googleEvent.start?.dateTime || googleEvent.start?.date || '',
      end: googleEvent.end?.dateTime || googleEvent.end?.date || '',
      location: googleEvent.location || '',
      attendees: googleEvent.attendees?.map(a => a.email) || [],
      reminders: googleEvent.reminders?.overrides?.map(r => ({
        method: r.method,
        minutes: r.minutes
      })) || [],
      recurrence: googleEvent.recurrence?.[0] || undefined,
      timezone: googleEvent.start?.timeZone || googleEvent.end?.timeZone,
      allDay: !googleEvent.start?.dateTime && !!googleEvent.start?.date,
      status: googleEvent.status
    };
  }

  /**
   * Map our CalendarEvent to Google Calendar event format
   */
  private mapCalendarEventToGoogleEvent(event: CalendarEvent): GoogleCalendarEvent {
    const isAllDay = event.allDay || false;
    const timezone = event.timezone || 'UTC';

    const googleEvent: GoogleCalendarEvent = {
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
      await this.apiRequest('/users/me/calendarList?maxResults=1');
      return 'operational';
    } catch {
      return 'down';
    }
  }
}
