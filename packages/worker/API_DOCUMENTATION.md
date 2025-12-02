# 📚 Dartmouth OS API Documentation

**Base URL:** `https://dartmouth-os-worker.lucy-hunter-9411.workers.dev`

All APIs return JSON responses and support CORS.

---

## Table of Contents

1. [Root & Health Endpoints](#root--health-endpoints)
2. [Dartmouth OS V2 APIs](#dartmouth-os-v2-apis)
3. [Authentication APIs](#authentication-apis)
4. [Customer Service APIs](#customer-service-apis)
5. [Email System V2 APIs](#email-system-v2-apis)
6. [Test Endpoints](#test-endpoints)

---

## Root & Health Endpoints

### GET `/`
Get API information and available endpoints.

**Request:**
```bash
GET /
```

**Response:**
```json
{
  "message": "Dartmouth OS Worker API",
  "version": "2.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "api": "/api/v2",
    "docs": "See README.md for API documentation"
  }
}
```

---

### GET `/health`
Health check endpoint.

**Request:**
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T23:50:27.056Z",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "cache": "up",
    "llm": "up"
  },
  "uptime": 292
}
```

---

### GET `/health/ready`
Readiness check for Kubernetes-style health checks.

**Request:**
```bash
GET /health/ready
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-12-01T23:50:27.056Z"
}
```

---

### GET `/health/live`
Liveness check for Kubernetes-style health checks.

**Request:**
```bash
GET /health/live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-12-01T23:50:27.056Z"
}
```

---

## Dartmouth OS V2 APIs

### POST `/api/v2/chat`
Send a message to an AI agent.

**Request:**
```json
{
  "message": "Hello, can you help me?",
  "agentId": "fam",
  "sessionId": "session-123",
  "userId": "user-456",
  "history": [],
  "context": {}
}
```

**Request Sample (PowerShell):**
```powershell
$body = @{
    message = "What is 2+2?"
    agentId = "fam"
    sessionId = "test-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Response:**
```json
{
  "content": "2 + 2 equals 4.",
  "type": "text",
  "metadata": {
    "timestamp": 1764633750285,
    "processingTime": 439,
    "cached": false
  }
}
```

**Available Agents:**
- `fam` - Default general assistant
- `mccarthy-artwork` - Artwork analysis agent
- `customer-service` - Customer service agent
- `test-agent` - Test agent

---

### GET `/api/v2/health`
Get health status of all agents or a specific agent.

**Request:**
```bash
GET /api/v2/health
GET /api/v2/health?agentId=fam
```

**Response:**
```json
{
  "status": "healthy",
  "agents": [
    {
      "agentId": "fam",
      "status": "healthy",
      "responseTime": 150,
      "errorCount": 0,
      "successCount": 100,
      "lastCheck": 1700000000000
    }
  ],
  "timestamp": 1700000000000
}
```

---

### GET `/api/v2/agents`
Get list of all registered agents.

**Request:**
```bash
GET /api/v2/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": "fam",
      "name": "FAM Agent",
      "version": "1.0.0",
      "description": "General purpose assistant",
      "status": "active",
      "capabilities": []
    }
  ],
  "count": 1
}
```

---

## Authentication APIs

### POST `/api/auth/login`
Login and get authentication token.

**Request:**
```json
{
  "email": "john@dtf.com.au",
  "password": "changeme123"
}
```

**Request Sample (PowerShell):**
```powershell
$body = @{
    email = "john@dtf.com.au"
    password = "changeme123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "john@dtf.com.au",
    "name": "John Doe",
    "role": "admin"
  }
}
```

---

### POST `/api/auth/logout`
Logout and invalidate token.

**Request:**
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/api/auth/me`
Get current authenticated user information.

**Request:**
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user-123",
  "email": "john@dtf.com.au",
  "name": "John Doe",
  "role": "admin"
}
```

---

## Customer Service APIs

**Note:** All customer service APIs require authentication. Include `Authorization: Bearer <token>` header.

### GET `/api/tickets`
List all tickets.

**Request:**
```bash
GET /api/tickets?status=open&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tickets": [
    {
      "id": "ticket-123",
      "subject": "Order issue",
      "status": "open",
      "priority": "high",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/tickets/:id`
Get a specific ticket.

**Request:**
```bash
GET /api/tickets/ticket-123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "ticket-123",
  "subject": "Order issue",
  "status": "open",
  "priority": "high",
  "messages": [],
  "createdAt": "2025-12-01T10:00:00Z"
}
```

---

### GET `/api/tickets/:id/messages`
Get messages for a ticket.

**Request:**
```bash
GET /api/tickets/ticket-123/messages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "content": "Hello, I have an issue...",
      "sender": "customer",
      "timestamp": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### PUT `/api/tickets/:id/assign`
Assign ticket to a staff member (Manager/Admin only).

**Request:**
```json
{
  "staffId": "staff-456"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "assignedTo": "staff-456"
  }
}
```

---

### PUT `/api/tickets/:id/status`
Update ticket status.

**Request:**
```json
{
  "status": "resolved"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "status": "resolved"
  }
}
```

---

### POST `/api/tickets/:id/reply`
Reply to a ticket.

**Request:**
```json
{
  "content": "Thank you for contacting us..."
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-2",
    "content": "Thank you for contacting us...",
    "timestamp": "2025-12-01T11:00:00Z"
  }
}
```

---

### POST `/api/tickets/:id/notes`
Add a note to a ticket.

**Request:**
```json
{
  "note": "Customer called, issue resolved"
}
```

**Response:**
```json
{
  "success": true,
  "note": {
    "id": "note-1",
    "content": "Customer called, issue resolved",
    "timestamp": "2025-12-01T11:00:00Z"
  }
}
```

---

### POST `/api/tickets/:id/snooze`
Snooze a ticket.

**Request:**
```json
{
  "snoozeUntil": "2025-12-02T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "snoozedUntil": "2025-12-02T10:00:00Z"
  }
}
```

---

### POST `/api/tickets/:id/unsnooze`
Unsnooze a ticket.

**Request:**
```bash
POST /api/tickets/ticket-123/unsnooze
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "snoozedUntil": null
  }
}
```

---

### POST `/api/tickets/:id/escalate`
Escalate a ticket.

**Request:**
```json
{
  "reason": "Complex technical issue"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "escalated": true,
    "escalationReason": "Complex technical issue"
  }
}
```

---

### POST `/api/tickets/:id/resolve-escalation`
Resolve an escalation.

**Request:**
```bash
POST /api/tickets/ticket-123/resolve-escalation
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-123",
    "escalated": false
  }
}
```

---

### POST `/api/tickets/:id/schedule-reply`
Schedule a reply to be sent later.

**Request:**
```json
{
  "content": "Follow-up message",
  "scheduledFor": "2025-12-02T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "scheduledMessage": {
    "id": "scheduled-msg-1",
    "content": "Follow-up message",
    "scheduledFor": "2025-12-02T10:00:00Z"
  }
}
```

---

### GET `/api/tickets/:id/scheduled-messages`
Get scheduled messages for a ticket.

**Request:**
```bash
GET /api/tickets/ticket-123/scheduled-messages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "scheduledMessages": [
    {
      "id": "scheduled-msg-1",
      "content": "Follow-up message",
      "scheduledFor": "2025-12-02T10:00:00Z",
      "status": "pending"
    }
  ]
}
```

---

### PUT `/api/scheduled-messages/:messageId`
Update a scheduled message.

**Request:**
```json
{
  "scheduledFor": "2025-12-02T11:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "scheduledMessage": {
    "id": "scheduled-msg-1",
    "scheduledFor": "2025-12-02T11:00:00Z"
  }
}
```

---

### DELETE `/api/scheduled-messages/:messageId`
Delete a scheduled message.

**Request:**
```bash
DELETE /api/scheduled-messages/scheduled-msg-1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduled message deleted"
}
```

---

## Mentions APIs

### GET `/api/mentions`
List all mentions.

**Request:**
```bash
GET /api/mentions?status=unread
Authorization: Bearer <token>
```

**Response:**
```json
{
  "mentions": [
    {
      "id": "mention-123",
      "platform": "twitter",
      "content": "@company mentioned you",
      "status": "unread",
      "timestamp": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/mentions/:id`
Get a specific mention.

**Request:**
```bash
GET /api/mentions/mention-123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "mention-123",
  "platform": "twitter",
  "content": "@company mentioned you",
  "status": "unread",
  "timestamp": "2025-12-01T10:00:00Z"
}
```

---

### POST `/api/mentions`
Create a mention.

**Request:**
```json
{
  "platform": "twitter",
  "content": "@company mentioned you",
  "url": "https://twitter.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "mention": {
    "id": "mention-123",
    "platform": "twitter",
    "content": "@company mentioned you",
    "timestamp": "2025-12-01T10:00:00Z"
  }
}
```

---

### POST `/api/mentions/:id/reply`
Reply to a mention.

**Request:**
```json
{
  "content": "Thank you for mentioning us!"
}
```

**Response:**
```json
{
  "success": true,
  "reply": {
    "id": "reply-1",
    "content": "Thank you for mentioning us!",
    "timestamp": "2025-12-01T11:00:00Z"
  }
}
```

---

### PUT `/api/mentions/:id/read`
Mark mention as read.

**Request:**
```bash
PUT /api/mentions/mention-123/read
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mention": {
    "id": "mention-123",
    "status": "read"
  }
}
```

---

## Settings APIs

**Note:** All settings APIs require Admin role.

### GET `/api/settings`
List all settings.

**Request:**
```bash
GET /api/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "settings": [
    {
      "key": "ai_response_mode",
      "value": "draft",
      "description": "AI response mode"
    }
  ]
}
```

---

### GET `/api/settings/:key`
Get a specific setting.

**Request:**
```bash
GET /api/settings/ai_response_mode
Authorization: Bearer <token>
```

**Response:**
```json
{
  "key": "ai_response_mode",
  "value": "draft",
  "description": "AI response mode"
}
```

---

### PUT `/api/settings/:key`
Update a setting.

**Request:**
```json
{
  "value": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "setting": {
    "key": "ai_response_mode",
    "value": "auto"
  }
}
```

---

## Staff APIs

### GET `/api/staff`
List all staff members.

**Request:**
```bash
GET /api/staff
Authorization: Bearer <token>
```

**Response:**
```json
{
  "staff": [
    {
      "id": "staff-123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "agent",
      "presence": "online"
    }
  ]
}
```

---

### GET `/api/staff/:id`
Get a specific staff member.

**Request:**
```bash
GET /api/staff/staff-123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "staff-123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "agent",
  "presence": "online"
}
```

---

### PUT `/api/staff/:id/presence`
Update staff presence.

**Request:**
```json
{
  "presence": "away"
}
```

**Response:**
```json
{
  "success": true,
  "staff": {
    "id": "staff-123",
    "presence": "away"
  }
}
```

---

## Email System V2 APIs

### GET `/api/v2/conversations`
List email conversations.

**Request:**
```bash
GET /api/v2/conversations?status=open
Authorization: Bearer <token>
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "subject": "Order inquiry",
      "status": "open",
      "lastMessageAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/v2/conversations/:id`
Get a specific conversation.

**Request:**
```bash
GET /api/v2/conversations/conv-123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "conv-123",
  "subject": "Order inquiry",
  "status": "open",
  "messages": [],
  "createdAt": "2025-12-01T10:00:00Z"
}
```

---

### POST `/api/v2/conversations/:id/reply`
Reply to a conversation.

**Request:**
```json
{
  "content": "Thank you for your email..."
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-1",
    "content": "Thank you for your email...",
    "timestamp": "2025-12-01T11:00:00Z"
  }
}
```

---

## Test Endpoints

### GET `/api/v2/test/ping`
Simple ping test.

**Request:**
```bash
GET /api/v2/test/ping
```

**Response:**
```json
{
  "success": true,
  "message": "Email V2 test routes are working!"
}
```

---

### POST `/api/v2/test/inbound`
Simulate inbound email (Development only).

**Request:**
```json
{
  "from": "customer@example.com",
  "subject": "Test email",
  "body": "This is a test"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conv-123"
}
```

---

### POST `/api/v2/test/outbound`
Test outbound email (Development only).

**Request:**
```json
{
  "to": "customer@example.com",
  "subject": "Test reply",
  "body": "This is a test reply"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123"
}
```

---

### POST `/api/v2/test/full-flow`
Test full email flow (Development only).

**Request:**
```json
{
  "from": "customer@example.com",
  "subject": "Test",
  "body": "Test message"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conv-123",
  "responseSent": true
}
```

---

### GET `/api/v2/test/conversations`
List test conversations (Development only).

**Request:**
```bash
GET /api/v2/test/conversations
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "subject": "Test",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/v2/test/cleanup`
Cleanup test data (Development only).

**Request:**
```bash
POST /api/v2/test/cleanup
```

**Response:**
```json
{
  "success": true,
  "deleted": 10
}
```

---

### POST `/test/chat`
Test chat endpoint (Development only).

**Request:**
```json
{
  "message": "Hello",
  "agentId": "test-agent"
}
```

**Response:**
```json
{
  "content": "Hello! How can I help?",
  "sessionId": "session-123",
  "metadata": {}
}
```

---

### POST `/test/intent`
Test intent detection (Development only).

**Request:**
```json
{
  "message": "I want to return my order"
}
```

**Response:**
```json
{
  "intent": "return_order",
  "confidence": 0.95
}
```

---

### POST `/test/validation`
Test response validation (Development only).

**Request:**
```json
{
  "response": "This is a test response"
}
```

**Response:**
```json
{
  "valid": true,
  "score": 0.9
}
```

---

### POST `/test/calculation`
Test calculation engine (Development only).

**Request:**
```json
{
  "expression": "2 + 2"
}
```

**Response:**
```json
{
  "result": 4,
  "expression": "2 + 2"
}
```

---

### POST `/test/memory`
Test memory system (Development only).

**Request:**
```json
{
  "sessionId": "session-123",
  "message": "My name is John"
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "name": "John"
  }
}
```

---

### POST `/test/rag`
Test RAG engine (Development only).

**Request:**
```json
{
  "query": "What are DTF printing requirements?"
}
```

**Response:**
```json
{
  "results": [
    {
      "content": "DTF printing requires...",
      "score": 0.95
    }
  ]
}
```

---

### GET `/test/session/:sessionId`
Get test session (Development only).

**Request:**
```bash
GET /test/session/session-123
```

**Response:**
```json
{
  "sessionId": "session-123",
  "messages": [],
  "metadata": {}
}
```

---

### POST `/test/batch`
Test batch messages (Development only).

**Request:**
```json
{
  "messages": [
    "Message 1",
    "Message 2"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "message": "Message 1",
      "response": "Response 1"
    }
  ]
}
```

---

## Utility Endpoints

### POST `/trigger-email-poll`
Manually trigger email polling (Testing).

**Request:**
```bash
POST /trigger-email-poll
```

**Response:**
```json
{
  "success": true,
  "message": "Email polling triggered",
  "logs": []
}
```

---

### POST `/trigger-send-scheduled`
Manually trigger scheduled message sender (Testing).

**Request:**
```bash
POST /trigger-send-scheduled
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduled message sender triggered",
  "logs": []
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-12-01T10:00:00Z"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

---

## Authentication

Most endpoints require authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Get a token by calling `POST /api/auth/login`.

---

## Rate Limiting

API requests are rate-limited. Check response headers for rate limit information:
- `X-RateLimit-Limit` - Maximum requests per period
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - When the limit resets

---

## CORS

All endpoints support CORS. Preflight requests are automatically handled.

---

**Last Updated:** December 1, 2025
**API Version:** 2.0

