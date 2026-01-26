/**
 * PA Agent V2 API Controller
 * 
 * Handles V2 PA chat endpoints for mobile app integration
 */

import { Context } from 'hono';
import type { Env } from '../types/shared';
import { handleChat } from '../routes/chat';
import { getUserRefreshToken } from './google-oauth';

/**
 * Parse scheduling request from natural language
 */
function parseSchedulingRequest(message: string): { isScheduling: boolean; title?: string; date?: Date; duration?: number } {
  const messageLower = message.toLowerCase();
  
  // Check if it's a scheduling request
  const schedulingPatterns = [
    /schedule\s+(a\s+)?(.+?)\s+(for|at|on|tomorrow|today|next)/i,
    /create\s+(a\s+)?(meeting|event|appointment)\s+(called|named|titled)?\s*(.+?)\s+(for|at|on|tomorrow|today|next)/i,
    /add\s+(a\s+)?(.+?)\s+to\s+(my\s+)?calendar/i,
    /book\s+(a\s+)?(.+?)\s+(for|at|on|tomorrow|today|next)/i,
    /set\s+up\s+(a\s+)?(.+?)\s+(for|at|on|tomorrow|today|next)/i,
  ];
  
  const isScheduling = schedulingPatterns.some(pattern => pattern.test(messageLower)) ||
    (messageLower.includes('schedule') && (messageLower.includes('meeting') || messageLower.includes('event') || messageLower.includes('appointment'))) ||
    (messageLower.includes('create') && (messageLower.includes('meeting') || messageLower.includes('event') || messageLower.includes('appointment'))) ||
    (messageLower.includes('add') && messageLower.includes('calendar'));
  
  if (!isScheduling) {
    return { isScheduling: false };
  }

  // Extract event title - look for "called X", "named X", or the meeting name
  let title = '';
  const calledMatch = message.match(/(?:called|named|titled)\s+["']?([^"']+?)["']?\s*(?:at|on|for|tomorrow|today|next|$)/i);
  if (calledMatch) {
    title = calledMatch[1].trim();
  } else {
    // Try to extract title from common patterns
    const titleMatch = message.match(/(?:schedule|create|book|add|set up)\s+(?:a\s+)?(?:meeting\s+)?(?:called\s+)?["']?([^"']+?)["']?\s+(?:at|on|for|tomorrow|today|next)/i);
    if (titleMatch) {
      title = titleMatch[1].trim()
        .replace(/^(?:a\s+)?(?:meeting\s+)?(?:called\s+)?/i, '')
        .replace(/\s+(?:meeting|event|appointment)$/i, '');
    }
  }
  
  // Extract time
  const timeMatch = message.match(/(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let hours = 0;
  let minutes = 0;
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    // If no am/pm specified and hour is between 1-7, assume PM for business hours
    if (!period && hours >= 1 && hours <= 7) hours += 12;
  }
  
  // Extract date
  const now = new Date();
  let targetDate = new Date(now);
  
  if (messageLower.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (messageLower.includes('today')) {
    // Keep today's date
  } else if (messageLower.includes('next week')) {
    targetDate.setDate(targetDate.getDate() + 7);
  } else if (messageLower.includes('next monday')) {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilMonday);
  } else if (messageLower.includes('next tuesday')) {
    const daysUntilTuesday = (9 - now.getDay()) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilTuesday);
  } else if (messageLower.includes('next wednesday')) {
    const daysUntilWednesday = (10 - now.getDay()) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilWednesday);
  } else if (messageLower.includes('next thursday')) {
    const daysUntilThursday = (11 - now.getDay()) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilThursday);
  } else if (messageLower.includes('next friday')) {
    const daysUntilFriday = (12 - now.getDay()) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilFriday);
  }
  
  // Set the time
  targetDate.setHours(hours, minutes, 0, 0);
  
  // Default duration: 1 hour
  const duration = 60;
  
  return {
    isScheduling: true,
    title: title || 'New Meeting',
    date: targetDate,
    duration,
  };
}

/**
 * POST /api/v2/pa/chat
 * Chat with PA Agent (V2)
 */
export async function chat(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string; roles?: string[] };
    const body = await c.req.json();
    const { message, sessionId, context = {} } = body;

    if (!message || typeof message !== 'string') {
      return c.json({ 
        success: false,
        error: 'Message is required' 
      }, 400);
    }

    // Get user profile for context
    const userProfile: any = await c.env.DB.prepare(`
      SELECT timezone, home_address, currency, locale, voice_settings
      FROM pa_ai_users
      WHERE user_id = ?
    `).bind(user.id).first();

    // Check if message is about calendar
    const messageLower = message.toLowerCase();
    const isCalendarQuery = messageLower.includes('calendar') || 
                           messageLower.includes('schedule') || 
                           messageLower.includes('appointment') || 
                           messageLower.includes('event') ||
                           messageLower.includes('meeting') ||
                           messageLower.includes("what's on") ||
                           messageLower.includes('what is on');

    // Check if it's a scheduling/creation request
    const schedulingRequest = parseSchedulingRequest(message);
    
    // Fetch calendar events if it's a calendar query
    let calendarEvents: any[] = [];
    let calendarContext = '';
    let schedulingResult = '';
    
    // Get calendar credentials
    const clientId = c.env.GOOGLE_CLIENT_ID as string | undefined;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET as string | undefined;
    
    // Get user's personal refresh token from database (per-user OAuth)
    let refreshToken = await getUserRefreshToken(c.env.DB, user.id);
    if (!refreshToken && user.email) {
      refreshToken = await getUserRefreshToken(c.env.DB, user.email);
    }
    
    console.log('[PA V2 Chat] Calendar check:', {
      isCalendarQuery,
      isSchedulingRequest: schedulingRequest.isScheduling,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasUserRefreshToken: !!refreshToken,
      userId: user.id,
      userEmail: user.email,
    });

    // Handle scheduling request first
    if (schedulingRequest.isScheduling && clientId && clientSecret && refreshToken) {
      try {
        // @ts-ignore - Package may not be built during development
        const { CalendarService } = await import('@agent-army/integration-services');
        const calendarService = new CalendarService({
          clientId,
          clientSecret,
          redirectUri: (c.env.GOOGLE_REDIRECT_URI || c.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/callback') as string,
          refreshToken
        });

        const startTime = schedulingRequest.date!;
        const endTime = new Date(startTime.getTime() + (schedulingRequest.duration! * 60 * 1000));
        
        console.log('[PA V2 Chat] Creating calendar event:', {
          title: schedulingRequest.title,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        });

        const createdEvent = await calendarService.createEvent({
          title: schedulingRequest.title!,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          description: `Created by McCarthy PA`,
        });

        console.log('[PA V2 Chat] Calendar event created:', {
          id: createdEvent.id,
          title: createdEvent.title,
        });

        // Format the confirmation message
        const dateStr = startTime.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });
        const timeStr = startTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Return success directly for scheduling requests
        return c.json({
          success: true,
          response: `✅ Done! I've scheduled **${schedulingRequest.title}** for ${dateStr} at ${timeStr}. The event has been added to your Google Calendar.`,
          sessionId: sessionId || `pa-ai-${user.id}-${Date.now()}`,
          messageId: `cal-${Date.now()}`,
          metadata: {
            calendarEventCreated: true,
            eventId: createdEvent.id,
            eventTitle: schedulingRequest.title,
            eventStart: startTime.toISOString(),
            eventEnd: endTime.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (scheduleError: any) {
        console.error('[PA V2 Chat] Calendar scheduling error:', {
          error: scheduleError?.message || scheduleError,
          stack: scheduleError?.stack,
        });
        schedulingResult = `\n\nI tried to schedule the event but encountered an error: ${scheduleError?.message || 'Unknown error'}. Please try again.`;
      }
    } else if (schedulingRequest.isScheduling && (!clientId || !clientSecret)) {
      schedulingResult = '\n\nI would love to schedule this for you, but calendar integration is not configured on the server. Please contact support.';
    } else if (schedulingRequest.isScheduling && !refreshToken) {
      schedulingResult = '\n\nI would love to schedule this for you, but you haven\'t connected your Google Calendar yet. Please go to Settings and connect your Google account to enable calendar scheduling.';
    }
    
    if (isCalendarQuery && !schedulingRequest.isScheduling) {
      try {
        if (clientId && clientSecret && refreshToken) {
          // Import CalendarService dynamically
          // @ts-ignore - Package may not be built during development
          const { CalendarService } = await import('@agent-army/integration-services');
          const calendarService = new CalendarService({
            clientId,
            clientSecret,
            redirectUri: (c.env.GOOGLE_REDIRECT_URI || c.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/callback') as string,
            refreshToken
          });

          // Parse date from query - determine what time range to fetch
          const now = new Date();
          let startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let endOfDay = new Date(startOfDay);
          let dateDescription = 'today';
          
          // Check for "tomorrow" in the message
          if (messageLower.includes('tomorrow')) {
            startOfDay.setDate(startOfDay.getDate() + 1);
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'tomorrow';
          } 
          // Check for "this week"
          else if (messageLower.includes('this week') || messageLower.includes('week')) {
            // Start from today, end on Sunday
            const daysUntilSunday = 7 - now.getDay();
            endOfDay.setDate(endOfDay.getDate() + daysUntilSunday + 1);
            dateDescription = 'this week';
          }
          // Check for "next week"
          else if (messageLower.includes('next week')) {
            const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
            startOfDay.setDate(startOfDay.getDate() + daysUntilNextMonday);
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 7);
            dateDescription = 'next week';
          }
          // Check for specific day names
          else if (messageLower.includes('monday')) {
            const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
            startOfDay.setDate(startOfDay.getDate() + (messageLower.includes('next') ? daysUntilMonday : (1 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Monday';
          }
          else if (messageLower.includes('tuesday')) {
            startOfDay.setDate(startOfDay.getDate() + ((2 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Tuesday';
          }
          else if (messageLower.includes('wednesday')) {
            startOfDay.setDate(startOfDay.getDate() + ((3 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Wednesday';
          }
          else if (messageLower.includes('thursday')) {
            startOfDay.setDate(startOfDay.getDate() + ((4 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Thursday';
          }
          else if (messageLower.includes('friday')) {
            startOfDay.setDate(startOfDay.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Friday';
          }
          else if (messageLower.includes('saturday')) {
            startOfDay.setDate(startOfDay.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Saturday';
          }
          else if (messageLower.includes('sunday')) {
            startOfDay.setDate(startOfDay.getDate() + ((7 - now.getDay()) % 7 || 7));
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            dateDescription = 'Sunday';
          }
          // Default: just today
          else {
            endOfDay.setDate(endOfDay.getDate() + 1);
          }

          console.log('[PA V2 Chat] Fetching calendar events...', {
            dateDescription,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
          });

          calendarEvents = await calendarService.listEvents({
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            maxResults: 20,
            orderBy: 'startTime',
          });

          console.log('[PA V2 Chat] Calendar events fetched:', {
            count: calendarEvents?.length || 0,
            events: calendarEvents?.slice(0, 3).map(e => ({ title: e.title, start: e.start })), // Log first 3 for debugging
          });

          // Format calendar events for LLM context
          if (calendarEvents && calendarEvents.length > 0) {
            calendarContext = `\n\nHere are the user's calendar events for ${dateDescription}:\n`;
            calendarEvents.forEach((event, index) => {
              // CalendarService returns events with start/end as ISO strings and title (not summary)
              const startTime = event.start; // Already a string (ISO format)
              const endTime = event.end; // Already a string (ISO format)
              const title = event.title || 'Untitled Event';
              const location = event.location || '';
              const description = event.description || '';
              
              calendarContext += `${index + 1}. **${title}**`;
              if (startTime) {
                try {
                  const startDate = new Date(startTime);
                  // Check if it's an all-day event (date only) or timed event
                  if (event.allDay) {
                    // All-day event - just show the date
                    calendarContext += ` - All day on ${startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}`;
                  } else {
                    // Timed event - show time and date
                    const dateLabel = startDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
                    calendarContext += ` - ${dateLabel} at ${startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                    if (endTime) {
                      const endDate = new Date(endTime);
                      calendarContext += ` to ${endDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                    }
                  }
                } catch (dateError) {
                  console.error('[PA V2 Chat] Error parsing date:', dateError);
                  // If date parsing fails, just show the raw string
                  calendarContext += ` - ${startTime}`;
                }
              }
              if (location) {
                calendarContext += ` at ${location}`;
              }
              if (description) {
                calendarContext += `\n   ${description}`;
              }
              calendarContext += '\n';
            });
            calendarContext += `\nPlease provide a clear summary of these events to the user.`;
          } else {
            calendarContext = `\n\nThe user has no calendar events scheduled for ${dateDescription}.`;
          }
        } else {
          console.warn('[PA V2 Chat] Calendar credentials missing:', {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasUserRefreshToken: !!refreshToken,
            userId: user.id,
          });
          
          // Provide helpful message based on what's missing
          if (!clientId || !clientSecret) {
            calendarContext = '\n\nCALENDAR: Calendar integration is not configured on the server. Please contact support.';
          } else if (!refreshToken) {
            calendarContext = '\n\nCALENDAR: You have not connected your Google Calendar yet. Please go to Settings > Connect Google Calendar to enable calendar access.';
          }
        }
      } catch (calendarError: any) {
        console.error('[PA V2 Chat] Calendar fetch error:', {
          error: calendarError?.message || calendarError,
          stack: calendarError?.stack,
          name: calendarError?.name,
        });
        calendarContext = `\n\nCALENDAR: Unable to fetch calendar events. Error: ${calendarError?.message || 'Unknown error'}`;
      }
    }

    // Build context
    const chatContext = {
      userId: user.id,
      timezone: userProfile?.timezone || 'Australia/Sydney',
      location: userProfile?.home_address || 'Unknown',
      currency: userProfile?.currency || 'AUD',
      locale: userProfile?.locale || 'en-AU',
      currentTime: new Date().toISOString(),
      ...context,
    };

    // Enhance message with calendar context if it's a calendar query
    let enhancedMessage = message;
    if (isCalendarQuery && calendarContext) {
      enhancedMessage = `${message}${calendarContext}`;
    }
    if (schedulingResult) {
      enhancedMessage = `${message}${schedulingResult}`;
    }

    // Create request for chat handler
    const chatRequest = new Request(c.req.url, {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify({
        message: enhancedMessage,
        sessionId: sessionId || `pa-ai-${user.id}-${Date.now()}`,
        userId: user.id,
        metadata: {
          ...chatContext,
          hasCalendarData: isCalendarQuery && calendarEvents.length > 0,
          calendarEventCount: calendarEvents.length,
        },
      }),
    });

    // Use existing chat handler with FAM agent
    const response = await handleChat('fam', chatRequest, c.env);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
      return c.json({ 
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      }, response.status);
    }
    
    const responseData = await response.json() as {
      content?: string;
      sessionId?: string;
      messageId?: string;
      metadata?: Record<string, any>;
      timestamp?: string;
    };
    
    // Ensure we have valid content
    let finalContent: string;
    if (!responseData || !responseData.content) {
      finalContent = 'I apologize, but I encountered an issue processing your message. Please try again.';
    } else if (typeof responseData.content === 'string') {
      const trimmed = responseData.content.trim();
      finalContent = trimmed.length === 0 
        ? 'I apologize, but I encountered an issue processing your message. Please try again.'
        : trimmed;
    } else {
      finalContent = 'I apologize, but I encountered an issue processing your message. Please try again.';
    }
    
    return c.json({
      success: true,
      response: finalContent,
      sessionId: responseData?.sessionId || sessionId || `pa-ai-${user.id}-${Date.now()}`,
      messageId: responseData?.messageId || null,
      metadata: responseData?.metadata || {},
      timestamp: responseData?.timestamp || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PA V2 Chat] Error:', error);
    return c.json({ 
      success: false,
      error: error.message || 'Internal server error',
    }, 500);
  }
}
