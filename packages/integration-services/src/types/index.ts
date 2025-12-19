/**
 * Integration Services Type Definitions
 */

// ============================================
// Calendar Types
// ============================================

export interface CalendarEvent {
  /** Event ID (optional for creation) */
  id?: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Start time (ISO 8601) */
  start: string;
  /** End time (ISO 8601) */
  end: string;
  /** Event location */
  location?: string;
  /** Attendee email addresses */
  attendees?: string[];
  /** Event reminders */
  reminders?: CalendarReminder[];
  /** Recurrence rule (RRULE format) */
  recurrence?: string;
  /** Calendar ID (default: 'primary') */
  calendarId?: string;
  /** Timezone */
  timezone?: string;
  /** All-day event flag */
  allDay?: boolean;
  /** Event status */
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarReminder {
  /** Reminder method */
  method: 'email' | 'popup' | 'sms';
  /** Minutes before event */
  minutes: number;
}

export interface CalendarListOptions {
  /** Calendar ID */
  calendarId?: string;
  /** Start of time range (ISO 8601) */
  timeMin?: string;
  /** End of time range (ISO 8601) */
  timeMax?: string;
  /** Maximum results to return */
  maxResults?: number;
  /** Sort order */
  orderBy?: 'startTime' | 'updated';
  /** Search query */
  query?: string;
  /** Show deleted events */
  showDeleted?: boolean;
}

export interface CalendarServiceConfig {
  /** Google OAuth Client ID */
  clientId: string;
  /** Google OAuth Client Secret */
  clientSecret: string;
  /** OAuth Redirect URI */
  redirectUri: string;
  /** Refresh token */
  refreshToken: string;
}

// ============================================
// Email Types
// ============================================

export interface EmailMessage {
  /** Message ID (optional for sending) */
  id?: string;
  /** Recipient(s) */
  to: string | string[];
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Email subject */
  subject: string;
  /** Email body */
  body: string;
  /** Body content type */
  bodyType?: 'text' | 'html';
  /** File attachments */
  attachments?: EmailAttachment[];
  /** Reply-to address */
  replyTo?: string;
  /** From address (if allowed by provider) */
  from?: string;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailAttachment {
  /** File name */
  filename: string;
  /** Base64 encoded content */
  content: string;
  /** MIME type */
  contentType: string;
  /** Content ID for inline attachments */
  contentId?: string;
}

export interface EmailListOptions {
  /** Folder to list from */
  folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
  /** Maximum results */
  maxResults?: number;
  /** Search query */
  query?: string;
  /** Only unread messages */
  unreadOnly?: boolean;
  /** Include attachments */
  includeAttachments?: boolean;
  /** Page token for pagination */
  pageToken?: string;
}

export interface EmailServiceConfig {
  /** Email provider */
  provider: 'gmail' | 'smtp' | 'outlook';
  /** Google OAuth Client ID (for Gmail) */
  clientId?: string;
  /** Google OAuth Client Secret (for Gmail) */
  clientSecret?: string;
  /** Refresh token (for Gmail) */
  refreshToken?: string;
  /** SMTP host */
  smtpHost?: string;
  /** SMTP port */
  smtpPort?: number;
  /** SMTP username */
  smtpUser?: string;
  /** SMTP password */
  smtpPassword?: string;
  /** Use TLS */
  smtpSecure?: boolean;
}

export interface EmailSendResult {
  /** Message ID */
  messageId: string;
  /** Thread ID */
  threadId?: string;
  /** Send status */
  status: 'sent' | 'queued' | 'failed';
}

export interface EmailDraftResult {
  /** Draft ID */
  draftId: string;
  /** Message ID */
  messageId?: string;
}

// ============================================
// SMS Types (V2 - Twilio)
// ============================================

export interface SMSMessage {
  /** Recipient phone number (E.164 format) */
  to: string;
  /** Message body */
  body: string;
  /** Sender phone number */
  from?: string;
  /** Media URLs (for MMS) */
  mediaUrls?: string[];
}

export interface SMSResult {
  /** Twilio message SID */
  messageId: string;
  /** Message status */
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  /** Recipient phone */
  to: string;
  /** Timestamp */
  timestamp: string;
  /** Error code (if failed) */
  errorCode?: string;
  /** Error message (if failed) */
  errorMessage?: string;
}

export interface SMSServiceConfig {
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Default from phone number */
  fromNumber: string;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  /** User email */
  email: string;
  /** User password */
  password: string;
}

export interface LoginResponse {
  /** JWT access token */
  token: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiry in seconds */
  expiresIn: number;
  /** User profile */
  user: UserProfile;
}

export interface UserProfile {
  /** User ID */
  id: string;
  /** User email */
  email: string;
  /** User name */
  name: string;
  /** User timezone */
  timezone?: string;
  /** Account created date */
  createdAt: string;
  /** Last active date */
  lastActiveAt?: string;
}

export interface TokenRefreshRequest {
  /** Refresh token */
  refreshToken: string;
}

export interface TokenRefreshResponse {
  /** New access token */
  token: string;
  /** Token expiry in seconds */
  expiresIn: number;
}

export interface AuthConfig {
  /** JWT signing secret */
  jwtSecret: string;
  /** Access token expiry in seconds */
  tokenExpiry: number;
  /** Refresh token expiry in seconds */
  refreshExpiry: number;
}

