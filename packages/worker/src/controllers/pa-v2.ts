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
 * Parse send email request from natural language
 */
function parseSendEmailRequest(message: string): { isSending: boolean; to?: string; subject?: string; body?: string } {
  const messageLower = message.toLowerCase();
  
  // Check if it's a send email request
  const isSending = (messageLower.includes('send') && (messageLower.includes('email') || messageLower.includes('mail'))) ||
                    (messageLower.includes('email') && messageLower.includes('to ')) ||
                    (messageLower.includes('compose') && messageLower.includes('email'));
  
  if (!isSending) {
    return { isSending: false };
  }

  // Normalize message for parsing - handle common voice recognition issues
  let normalizedMessage = message
    // Fix "at gmail.com" → "@gmail.com" (voice often transcribes @ as "at")
    .replace(/\s+at\s+(gmail|yahoo|hotmail|outlook|icloud|proton|aol)\.com/gi, '@$1.com')
    .replace(/\s+at\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, '@$1')
    // Fix common voice transcription errors
    .replace(/\bbuddy\b/gi, 'body')
    .replace(/\bsubject\s+is\b/gi, 'subject')
    .replace(/\bbody\s+is\b/gi, 'body');

  // Extract email address - look for email patterns
  const emailMatch = normalizedMessage.match(/(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const to = emailMatch ? emailMatch[1] : undefined;

  // Extract subject - look for "subject 'X'" or "with subject 'X'"
  let subject = '';
  // Try with quotes first
  const subjectQuotedMatch = normalizedMessage.match(/subject\s+["']([^"']+)["']/i);
  if (subjectQuotedMatch) {
    subject = subjectQuotedMatch[1].trim();
  } else {
    // Try without quotes - capture until "and", "with", "body", or end
    const subjectMatch = normalizedMessage.match(/subject\s+([^"']+?)(?:\s+(?:and|with|body|saying)|,|$)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }
  }

  // Extract body - look for "body 'X'", "saying 'X'", etc.
  let body = '';
  // Try with quotes first - most reliable
  const bodyQuotedMatch = normalizedMessage.match(/(?:body|saying|content)\s+["']([^"']+)["']/i);
  if (bodyQuotedMatch) {
    body = bodyQuotedMatch[1].trim();
  } else {
    // Try "and body 'X'" or "with body 'X'"
    const altBodyMatch = normalizedMessage.match(/(?:and|with)\s+body\s+["']([^"']+)["']/i);
    if (altBodyMatch) {
      body = altBodyMatch[1].trim();
    } else {
      // Try without quotes - capture everything after "body" or after comma
      const bodyUnquotedMatch = normalizedMessage.match(/(?:body|saying|content)[,:]?\s+(.+)$/i);
      if (bodyUnquotedMatch) {
        body = bodyUnquotedMatch[1].trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes if any
      } else {
        // Try capturing after comma (e.g., "subject test, this is the body")
        const afterCommaMatch = normalizedMessage.match(/subject\s+[^,]+,\s*(.+)$/i);
        if (afterCommaMatch) {
          body = afterCommaMatch[1].trim();
        }
      }
    }
  }

  console.log('[PA V2 Chat] Parsed send email request:', {
    to,
    subject,
    body,
    originalMessage: message,
  });

  return {
    isSending: true,
    to,
    subject: subject || 'Message from McCarthy',
    body: body || 'Sent via McCarthy PA',
  };
}

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
    
    // Check if this is a document upload context - don't trigger email/calendar queries for documents
    const isDocumentUpload = messageLower.includes('the user uploaded a document') ||
                             messageLower.includes('document content:') ||
                             messageLower.includes('the user took a photo') ||
                             messageLower.includes('image analysis:');
    
    // Only check for calendar/email queries if NOT a document upload
    const isCalendarQuery = !isDocumentUpload && (
                           messageLower.includes('calendar') || 
                           messageLower.includes('schedule') || 
                           messageLower.includes('appointment') || 
                           messageLower.includes('event') ||
                           messageLower.includes('meeting') ||
                           messageLower.includes("what's on") ||
                           messageLower.includes('what is on'));

    // Check if message is about reading emails - skip if document upload
    const isEmailQuery = !isDocumentUpload && (
                        messageLower.includes('email') || 
                        messageLower.includes('emails') ||
                        messageLower.includes('inbox') ||
                        messageLower.includes('mail') ||
                        (messageLower.includes('message') && !messageLower.includes('calendar')) ||
                        (messageLower.includes('messages') && !messageLower.includes('calendar')));

    // Check if it's a send email request
    const isSendEmailRequest = (messageLower.includes('send') && (messageLower.includes('email') || messageLower.includes('mail'))) ||
                               (messageLower.includes('email') && messageLower.includes('to ')) ||
                               (messageLower.includes('compose') && messageLower.includes('email'));

    // Check if it's a scheduling/creation request
    const schedulingRequest = parseSchedulingRequest(message);
    
    // Fetch calendar events if it's a calendar query
    let calendarEvents: any[] = [];
    let calendarContext = '';
    let schedulingResult = '';
    let emailContext = '';
    
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

    // Handle send email request first
    if (isSendEmailRequest && clientId && clientSecret && refreshToken) {
      const sendEmailRequest = parseSendEmailRequest(message);
      
      if (sendEmailRequest.isSending && sendEmailRequest.to) {
        try {
          // @ts-ignore - Package may not be built during development
          const { EmailService } = await import('@agent-army/integration-services');
          const emailService = new EmailService({
            provider: 'gmail',
            clientId,
            clientSecret,
            refreshToken
          });

          console.log('[PA V2 Chat] Sending email...', {
            to: sendEmailRequest.to,
            subject: sendEmailRequest.subject,
            bodyLength: sendEmailRequest.body?.length || 0,
          });

          const result = await emailService.send({
            to: sendEmailRequest.to,
            subject: sendEmailRequest.subject || 'Message from McCarthy',
            body: sendEmailRequest.body || 'Sent via McCarthy PA',
          });

          console.log('[PA V2 Chat] Email sent:', {
            messageId: result.messageId,
            status: result.status,
          });

          // Return success directly for send email requests
          return c.json({
            success: true,
            response: `✅ Done! I've sent an email to **${sendEmailRequest.to}** with subject "**${sendEmailRequest.subject}**".`,
            sessionId: sessionId || `pa-ai-${user.id}-${Date.now()}`,
            messageId: `email-${Date.now()}`,
            metadata: {
              emailSent: true,
              to: sendEmailRequest.to,
              subject: sendEmailRequest.subject,
              messageId: result.messageId,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (sendError: any) {
          console.error('[PA V2 Chat] Email send error:', {
            error: sendError?.message || sendError,
            stack: sendError?.stack,
          });
          emailContext = `\n\nI tried to send the email but encountered an error: ${sendError?.message || 'Unknown error'}. Please try again.`;
        }
      } else if (sendEmailRequest.isSending && !sendEmailRequest.to) {
        emailContext = '\n\nI need an email address to send the email. Please specify who you want to send it to.';
      }
    } else if (isSendEmailRequest && (!clientId || !clientSecret)) {
      emailContext = '\n\nEMAIL: Email integration is not configured on the server. Please contact support.';
    } else if (isSendEmailRequest && !refreshToken) {
      emailContext = '\n\nEMAIL: You have not connected your Google account yet. Please go to Settings and sign in with Google to enable email sending.';
    }

    // Handle email query (reading emails)
    if (isEmailQuery && !isSendEmailRequest) {
      console.log('[PA V2 Chat] Email query detected');
      
      if (clientId && clientSecret && refreshToken) {
        try {
          // @ts-ignore - Package may not be built during development
          const { EmailService } = await import('@agent-army/integration-services');
          const emailService = new EmailService({
            provider: 'gmail',
            clientId,
            clientSecret,
            refreshToken
          });

          // Determine email folder based on query
          let folder: 'inbox' | 'sent' | 'drafts' = 'inbox';
          let maxResults = 10;
          let unreadOnly = false;
          
          if (messageLower.includes('sent')) {
            folder = 'sent';
          } else if (messageLower.includes('draft')) {
            folder = 'drafts';
          }
          if (messageLower.includes('unread')) {
            unreadOnly = true;
          }

          console.log('[PA V2 Chat] Fetching emails...', { folder, maxResults, unreadOnly });

          const emails = await emailService.listMessages({
            folder,
            maxResults,
            unreadOnly,
          });

          console.log('[PA V2 Chat] Emails fetched:', {
            count: emails?.length || 0,
            folder,
          });

          // Format emails for response
          if (emails && emails.length > 0) {
            emailContext = `\n\nHere are your recent ${unreadOnly ? 'unread ' : ''}emails from ${folder}:\n`;
            emails.forEach((email: any, index: number) => {
              const from = email.from || 'Unknown sender';
              const subject = email.subject || '(No subject)';
              const date = email.date ? new Date(email.date).toLocaleDateString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : '';
              const snippet = email.snippet ? email.snippet.substring(0, 100) + (email.snippet.length > 100 ? '...' : '') : '';
              
              emailContext += `${index + 1}. **${subject}**\n`;
              emailContext += `   From: ${from}\n`;
              if (date) emailContext += `   Date: ${date}\n`;
              if (snippet) emailContext += `   Preview: ${snippet}\n`;
              emailContext += '\n';
            });
            emailContext += `\nPlease provide a clear summary of these emails to the user.`;
          } else {
            emailContext = `\n\nYou have no ${unreadOnly ? 'unread ' : ''}emails in your ${folder}.`;
          }
        } catch (emailError: any) {
          console.error('[PA V2 Chat] Email fetch error:', {
            error: emailError?.message || emailError,
            stack: emailError?.stack,
          });
          emailContext = `\n\nEMAIL: Unable to fetch emails. Error: ${emailError?.message || 'Unknown error'}`;
        }
      } else if (!clientId || !clientSecret) {
        emailContext = '\n\nEMAIL: Email integration is not configured on the server. Please contact support.';
      } else if (!refreshToken) {
        emailContext = '\n\nEMAIL: You have not connected your Google account yet. Please go to Settings and sign in with Google to enable email access.';
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

    // Enhance message with calendar/email context
    let enhancedMessage = message;
    if (isCalendarQuery && calendarContext) {
      enhancedMessage = `${message}${calendarContext}`;
    }
    if (schedulingResult) {
      enhancedMessage = `${message}${schedulingResult}`;
    }
    if (isEmailQuery && emailContext) {
      enhancedMessage = `${message}${emailContext}`;
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
