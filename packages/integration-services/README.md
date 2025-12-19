# Integration Services

Integration Services provides Calendar, Email, and SMS functionality for ALL Dartmouth OS agents. This package enables agents to interact with external services like Google Calendar, Gmail, and Twilio.

## Overview

This package is designed to be **generic and reusable** for all agents in the Dartmouth OS platform:

- **PA Agent**: Personal/family calendar management, email coordination
- **Customer Service Agent**: Appointment booking, email support
- **Sales Agent**: Meeting scheduling, email campaigns
- **Future agents**: Any agent needing calendar/email functionality

## Installation

```bash
npm install @agent-army/integration-services
```

## Services

### CalendarService

Google Calendar integration for event management.

```typescript
import { CalendarService } from '@agent-army/integration-services';

const calendarService = new CalendarService({
  clientId: 'your-google-client-id',
  clientSecret: 'your-google-client-secret',
  redirectUri: 'http://localhost:3000/callback',
  refreshToken: 'your-refresh-token'
});

// List events
const events = await calendarService.listEvents({
  timeMin: '2025-12-01T00:00:00Z',
  timeMax: '2025-12-31T23:59:59Z'
});

// Create event
const event = await calendarService.createEvent({
  title: 'Team Meeting',
  start: '2025-12-20T10:00:00Z',
  end: '2025-12-20T11:00:00Z',
  description: 'Weekly team sync',
  location: 'Conference Room A',
  attendees: ['john@example.com', 'jane@example.com']
});
```

### EmailService

Gmail API integration for email operations.

```typescript
import { EmailService } from '@agent-army/integration-services';

const emailService = new EmailService({
  provider: 'gmail',
  clientId: 'your-google-client-id',
  clientSecret: 'your-google-client-secret',
  refreshToken: 'your-refresh-token'
});

// Send email
const result = await emailService.send({
  to: 'recipient@example.com',
  subject: 'Meeting Follow-up',
  body: 'Hi,\n\nThanks for the meeting today...',
  bodyType: 'text'
});

// List messages
const messages = await emailService.listMessages({
  folder: 'inbox',
  maxResults: 20,
  unreadOnly: true
});
```

### SMSService

Twilio SMS integration (stub for V2).

```typescript
import { SMSService } from '@agent-army/integration-services';

const smsService = new SMSService({
  accountSid: 'your-twilio-account-sid',
  authToken: 'your-twilio-auth-token',
  fromNumber: '+1234567890'
});

// Note: Full implementation coming in V2
```

## API Endpoints

All services are exposed via V2 API endpoints:

### Calendar Endpoints

- `GET /api/v2/calendar/events` - List events
- `GET /api/v2/calendar/events/:id` - Get event
- `POST /api/v2/calendar/events` - Create event
- `PUT /api/v2/calendar/events/:id` - Update event
- `DELETE /api/v2/calendar/events/:id` - Delete event

### Email Endpoints

- `GET /api/v2/email/messages` - List messages
- `POST /api/v2/email/send` - Send email
- `POST /api/v2/email/draft` - Create draft

### Auth Endpoints

- `POST /api/v2/auth/login` - Login
- `POST /api/v2/auth/refresh` - Refresh token
- `POST /api/v2/auth/logout` - Logout
- `GET /api/v2/auth/me` - Get current user

## Type Definitions

All types are exported from the package:

```typescript
import type {
  CalendarEvent,
  CalendarListOptions,
  EmailMessage,
  EmailListOptions,
  SMSMessage,
  LoginRequest,
  LoginResponse,
  UserProfile
} from '@agent-army/integration-services';
```

## Configuration

### Environment Variables

Required environment variables:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_REFRESH_TOKEN=xxx

# Gmail (same as Google OAuth)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx

# JWT
JWT_SECRET=your-256-bit-secret

# Twilio (V2)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

```bash
npm test
npm run test:coverage
```

Test coverage target: >70%

## Development

```bash
# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT

