/**
 * PA Agent V2 API Controller
 * 
 * Handles V2 PA chat endpoints for mobile app integration
 */

import { Context } from 'hono';
import type { Env } from '../types/shared';
import { handleChat } from '../routes/chat';

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

    // Fetch calendar events if it's a calendar query
    let calendarEvents: any[] = [];
    let calendarContext = '';
    
    if (isCalendarQuery) {
      try {
        // Check if Google Calendar credentials are configured
        // Try both GOOGLE_* and GMAIL_* variable names for compatibility
        const clientId = (c.env.GOOGLE_CLIENT_ID || c.env.GMAIL_CLIENT_ID) as string | undefined;
        const clientSecret = (c.env.GOOGLE_CLIENT_SECRET || c.env.GMAIL_CLIENT_SECRET) as string | undefined;
        const refreshToken = (c.env.GOOGLE_REFRESH_TOKEN || c.env.GMAIL_REFRESH_TOKEN) as string | undefined;
        
        console.log('[PA V2 Chat] Calendar query detected, checking credentials...', {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasRefreshToken: !!refreshToken,
        });

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

          // Get today's events
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(endOfDay.getDate() + 1);

          console.log('[PA V2 Chat] Fetching calendar events...', {
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
            calendarContext = `\n\nHere are the user's calendar events for today:\n`;
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
                    // Timed event - show time
                    calendarContext += ` - ${startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
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
            calendarContext = `\n\nThe user has no calendar events scheduled for today.`;
          }
        } else {
          console.warn('[PA V2 Chat] Calendar credentials missing:', {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasRefreshToken: !!refreshToken,
          });
          calendarContext = '\n\nCALENDAR: Calendar integration is not configured. Google Calendar credentials are missing.';
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
