import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from '../src/CalendarService';

// Mock googleapis
vi.mock('googleapis', () => {
  const mockCalendar = {
    events: {
      list: vi.fn(),
      get: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    calendarList: {
      list: vi.fn()
    }
  };

  const MockOAuth2Client = vi.fn().mockImplementation(() => ({
    setCredentials: vi.fn()
  }));

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2Client,
        OAuth2Client: MockOAuth2Client
      },
      calendar: vi.fn(() => mockCalendar)
    }
  };
});

describe('CalendarService', () => {
  let calendarService: CalendarService;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    refreshToken: 'test-refresh-token'
  };

  beforeEach(() => {
    calendarService = new CalendarService(mockConfig);
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should throw error if title is missing', async () => {
      await expect(
        calendarService.createEvent({
          title: '',
          start: '2025-12-20T10:00:00Z',
          end: '2025-12-20T11:00:00Z'
        })
      ).rejects.toThrow('Event title is required');
    });

    it('should throw error if start time is missing', async () => {
      await expect(
        calendarService.createEvent({
          title: 'Test Event',
          start: '',
          end: '2025-12-20T11:00:00Z'
        })
      ).rejects.toThrow('Event start and end times are required');
    });

    it('should throw error if end time is missing', async () => {
      await expect(
        calendarService.createEvent({
          title: 'Test Event',
          start: '2025-12-20T10:00:00Z',
          end: ''
        })
      ).rejects.toThrow('Event start and end times are required');
    });

    it('should create event with valid data', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();

      mockCalendar.events.insert.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Test Event',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' },
          description: 'Test description'
        }
      });

      const result = await calendarService.createEvent({
        title: 'Test Event',
        start: '2025-12-20T10:00:00Z',
        end: '2025-12-20T11:00:00Z',
        description: 'Test description'
      });

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Event');
      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it('should create event with attendees and reminders', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.insert.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Team Meeting',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' },
          attendees: [
            { email: 'john@example.com' },
            { email: 'jane@example.com' }
          ],
          reminders: {
            overrides: [{ method: 'popup', minutes: 15 }]
          }
        }
      });

      const result = await calendarService.createEvent({
        title: 'Team Meeting',
        start: '2025-12-20T10:00:00Z',
        end: '2025-12-20T11:00:00Z',
        attendees: ['john@example.com', 'jane@example.com'],
        reminders: [{ method: 'popup', minutes: 15 }]
      });

      expect(result.attendees).toHaveLength(2);
      expect(result.reminders).toHaveLength(1);
    });
  });

  describe('listEvents', () => {
    it('should list events with default options', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'event1',
              summary: 'Event 1',
              start: { dateTime: '2025-12-20T10:00:00Z' },
              end: { dateTime: '2025-12-20T11:00:00Z' }
            },
            {
              id: 'event2',
              summary: 'Event 2',
              start: { dateTime: '2025-12-21T10:00:00Z' },
              end: { dateTime: '2025-12-21T11:00:00Z' }
            }
          ]
        }
      });

      const events = await calendarService.listEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toHaveProperty('id');
      expect(events[0]).toHaveProperty('title');
      expect(mockCalendar.events.list).toHaveBeenCalled();
    });

    it('should list events with custom options', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.list.mockResolvedValue({
        data: { items: [] }
      });

      await calendarService.listEvents({
        timeMin: '2025-12-01T00:00:00Z',
        timeMax: '2025-12-31T23:59:59Z',
        maxResults: 10,
        orderBy: 'startTime'
      });

      expect(mockCalendar.events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          timeMin: '2025-12-01T00:00:00Z',
          timeMax: '2025-12-31T23:59:59Z',
          maxResults: 10,
          orderBy: 'startTime'
        })
      );
    });

    it('should return empty array when no events found', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.list.mockResolvedValue({
        data: { items: [] }
      });

      const events = await calendarService.listEvents();

      expect(events).toHaveLength(0);
    });
  });

  describe('getEvent', () => {
    it('should get a single event', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.get.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Test Event',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' },
          description: 'Test description'
        }
      });

      const event = await calendarService.getEvent('event123');

      expect(event).toHaveProperty('id', 'event123');
      expect(event.title).toBe('Test Event');
      expect(mockCalendar.events.get).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event123'
      });
    });

    it('should get event from custom calendar', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.get.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Test Event',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' }
        }
      });

      await calendarService.getEvent('event123', 'custom-calendar-id');

      expect(mockCalendar.events.get).toHaveBeenCalledWith({
        calendarId: 'custom-calendar-id',
        eventId: 'event123'
      });
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      // Mock getEvent (used to get existing event)
      mockCalendar.events.get.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Original Title',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' }
        }
      });

      mockCalendar.events.update.mockResolvedValue({
        data: {
          id: 'event123',
          summary: 'Updated Title',
          start: { dateTime: '2025-12-20T10:00:00Z' },
          end: { dateTime: '2025-12-20T11:00:00Z' }
        }
      });

      const result = await calendarService.updateEvent('event123', {
        title: 'Updated Title'
      });

      expect(result.title).toBe('Updated Title');
      expect(mockCalendar.events.update).toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.delete.mockResolvedValue({});

      await calendarService.deleteEvent('event123');

      expect(mockCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event123'
      });
    });

    it('should delete event from custom calendar', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.events.delete.mockResolvedValue({});

      await calendarService.deleteEvent('event123', 'custom-calendar-id');

      expect(mockCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'custom-calendar-id',
        eventId: 'event123'
      });
    });
  });

  describe('checkHealth', () => {
    it('should return operational when calendar API is accessible', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.calendarList.list.mockResolvedValue({
        data: { items: [] }
      });

      const status = await calendarService.checkHealth();

      expect(status).toBe('operational');
    });

    it('should return down when calendar API fails', async () => {
      const { google } = await import('googleapis');
      const mockCalendar = (google.calendar as any)();
      
      mockCalendar.calendarList.list.mockRejectedValue(new Error('API Error'));

      const status = await calendarService.checkHealth();

      expect(status).toBe('down');
    });
  });
});

