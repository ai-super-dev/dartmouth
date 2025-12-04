# 🌐 MCCARTHY AI DARTMOUTH OS - MASTER API ARCHITECTURE

**Version:** 3.0  
**Date:** December 5, 2025  
**Status:** Active Development - 96% Complete  
**Document Type:** Unified API Specification

---

## 📋 TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [API Design Principles](#2-api-design-principles)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Core Platform APIs](#4-core-platform-apis)
5. [Agent APIs](#5-agent-apis)
6. [Customer Service APIs](#6-customer-service-apis)
7. [Live Chat APIs](#7-live-chat-apis)
8. [AI Agent Configuration APIs](#8-ai-agent-configuration-apis)
9. [Auto-Assignment APIs](#9-auto-assignment-apis)
10. [Integration APIs](#10-integration-apis)
11. [Admin APIs](#11-admin-apis)
12. [WebSocket Protocol](#12-websocket-protocol)
13. [Error Handling](#13-error-handling)
14. [Rate Limiting](#14-rate-limiting)
15. [API Versioning](#15-api-versioning)

---

## 1. OVERVIEW

### Purpose

This document defines the **complete API architecture** for McCarthy AI Dartmouth OS, covering:

- **Core Platform APIs** - Health, monitoring, analytics
- **Agent APIs** - McCarthy Artwork, Customer Service, Sales, PA
- **Customer Service APIs** - Tickets, staff, mentions
- **Live Chat APIs** - Real-time chat conversations
- **AI Agent Configuration APIs** - RAG, System Message, Widget Settings
- **Auto-Assignment APIs** - Email ticket auto-assignment
- **Integration APIs** - Shopify, PERP, Stripe, Twilio
- **Admin APIs** - Tenant management, settings, permissions

### Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://dartmouth-os-worker.dartmouth.workers.dev` |
| **Staging** | `https://staging-api.dartmouth-os.com` |
| **Development** | `http://localhost:8787` |

### API Versions

| Version | Status | Base Path | Notes |
|---------|--------|-----------|-------|
| **v1** | 🟡 Legacy | `/api/v1` | Basic agent chat API |
| **v2** | ✅ Current | `/api/v2` | Full Dartmouth OS API |
| **v3** | 📋 Planned | `/api/v3` | Multi-tenant SaaS |

---

## 2. API DESIGN PRINCIPLES

### RESTful Design

- **Resources** are nouns (e.g., `/tickets`, `/agents`)
- **Actions** are HTTP verbs (GET, POST, PUT, DELETE)
- **Hierarchical** structure (e.g., `/tickets/:id/messages`)
- **Stateless** - each request contains all necessary information

### Naming Conventions

```
✅ Good:
GET    /api/v2/tickets
GET    /api/v2/tickets/:id
POST   /api/v2/tickets
PUT    /api/v2/tickets/:id
DELETE /api/v2/tickets/:id
POST   /api/v2/tickets/:id/reply

❌ Bad:
GET    /api/v2/getTickets
POST   /api/v2/createTicket
POST   /api/v2/tickets/:id/sendReply
```

### Response Format

**Success Response:**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "timestamp": "2025-12-02T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "meta": {
    "timestamp": "2025-12-02T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **200** | OK | Successful GET, PUT, DELETE |
| **201** | Created | Successful POST |
| **204** | No Content | Successful DELETE with no response body |
| **400** | Bad Request | Invalid request format |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Authenticated but no permission |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation error |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **503** | Service Unavailable | Service down |

---

## 3. AUTHENTICATION & AUTHORIZATION

### JWT Authentication

**All API requests (except `/auth/login` and `/auth/register`) require authentication:**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Auth Endpoints

#### POST /api/v2/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "john@dtf.com.au",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "usr_abc123",
      "email": "john@dtf.com.au",
      "firstName": "John",
      "lastName": "Hutchison",
      "role": "admin"
    }
  }
}
```

---

### Role-Based Access Control (RBAC)

| Role | Permissions | Description |
|------|-------------|-------------|
| **admin** | `*` (all) | Full system access |
| **manager** | `tickets:*, staff:read, settings:read` | Manage tickets and view staff |
| **agent** | `tickets:read, tickets:write, tickets:own` | Handle assigned tickets |
| **general** | `tickets:own` | View own tickets only |

---

## 4. CORE PLATFORM APIs

### Health & Monitoring

#### GET /health

System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T10:00:00Z",
  "version": "2.0.0",
  "services": {
    "database": "up",
    "cache": "up",
    "llm": "up",
    "email": "up"
  }
}
```

---

### Analytics

#### GET /api/v2/analytics/overview

Get system-wide analytics.

**Query Parameters:**
- `startDate` (optional) - ISO 8601 date (default: 30 days ago)
- `endDate` (optional) - ISO 8601 date (default: now)

**Response:**
```json
{
  "data": {
    "tickets": {
      "total": 1250,
      "open": 45,
      "resolved": 1180,
      "averageResponseTime": 245,
      "averageResolutionTime": 3600
    },
    "ai": {
      "automationRate": 0.75,
      "averageConfidence": 0.82,
      "escalationRate": 0.25,
      "averageQuality": 4.2,
      "approvalRate": 0.85
    },
    "staff": {
      "totalActive": 5,
      "averageTicketsPerAgent": 250
    }
  }
}
```

---

## 5. AGENT APIs

### Universal Agent Chat Endpoint

#### POST /api/v2/agents/:agentId/chat

Send a message to any agent.

**Path Parameters:**
- `agentId` - Agent identifier (`mccarthy-artwork`, `customer-service`, `sales-agent`, `mccarthy-pa`)

**Request:**
```json
{
  "message": "What's the DPI at 28.5cm wide?",
  "sessionId": "sess_abc123",
  "metadata": {
    "source": "web",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "data": {
    "content": "At 28.5cm (11.22\") wide: **251 DPI** ⭐⭐⭐⭐ (Optimal quality)",
    "metadata": {
      "sessionId": "sess_abc123",
      "messageId": "msg_xyz789",
      "processingTimeMs": 1250,
      "intent": "calculate_dpi",
      "confidence": 0.95,
      "handler": "SizeCalculationHandler"
    }
  }
}
```

---

## 6. CUSTOMER SERVICE APIs

### Tickets

#### GET /api/v2/tickets

List tickets with optional filters.

**Query Parameters:**
- `status` (optional) - Filter by status (`open`, `in-progress`, `resolved`, `closed`, `escalated`, `snoozed`)
- `priority` (optional) - Filter by priority (`low`, `normal`, `high`, `critical`, `urgent`)
- `sentiment` (optional) - Filter by sentiment (`positive`, `neutral`, `negative`, `angry`)
- `assignedTo` (optional) - Filter by assigned staff ID
- `platform` (optional) - Filter by platform (`email`, `chat`, `whatsapp`, etc.)
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": {
    "tickets": [
      {
        "ticket_id": "tkt_abc123",
        "ticket_number": "TKT-000001",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe",
        "subject": "Order inquiry",
        "status": "open",
        "priority": "normal",
        "sentiment": "neutral",
        "category": "order_status",
        "platform": "email",
        "assigned_to": "usr_xyz789",
        "assigned_staff_name": "John Hutchison",
        "created_at": "2025-12-02T10:00:00Z",
        "updated_at": "2025-12-02T10:00:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### POST /api/v2/tickets/:id/merge

Merge multiple tickets into one.

**Request:**
```json
{
  "sourceTicketIds": ["tkt_def456", "tkt_ghi789"]
}
```

**Response:**
```json
{
  "data": {
    "ticket": {
      "ticket_id": "tkt_abc123",
      "merged_from": ["tkt_def456", "tkt_ghi789"],
      "merged_at": "2025-12-02T10:05:00Z",
      "merged_by": "usr_xyz789"
    }
  }
}
```

---

#### POST /api/v2/tickets/bulk-reassign

Reassign multiple tickets at once.

**Request:**
```json
{
  "ticketIds": ["tkt_abc123", "tkt_def456"],
  "assignedTo": "usr_xyz789"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "reassignedCount": 2
  }
}
```

---

#### POST /api/v2/tickets/bulk-delete

Delete multiple tickets at once (soft delete).

**Request:**
```json
{
  "ticketIds": ["tkt_abc123", "tkt_def456"]
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "deletedCount": 2
  }
}
```

---

### Staff

#### GET /api/v2/staff

List all active staff members.

**Response:**
```json
{
  "data": {
    "staff": [
      {
        "id": "usr_abc123",
        "email": "john@dtf.com.au",
        "first_name": "John",
        "last_name": "Hutchison",
        "role": "admin",
        "job_title": "Owner",
        "department": "Management",
        "phone": "+61 400 000 000",
        "is_active": true,
        "availability_status": "online",
        "auto_assignment_opt_out": false,
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": "ai-agent-001",
        "email": "ai-agent@dtf.com.au",
        "first_name": "McCarthy",
        "last_name": "AI",
        "role": "agent",
        "is_active": true,
        "is_ai": true,
        "availability_status": "online",
        "created_at": "2025-12-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### PUT /api/v2/staff/:id/availability

Update staff availability status.

**Request:**
```json
{
  "status": "online"
}
```

**Valid statuses:** `online`, `away`, `offline`

**Response:**
```json
{
  "data": {
    "staff": {
      "id": "usr_abc123",
      "availability_status": "online",
      "updated_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

## 7. LIVE CHAT APIs

### Chat Conversations

#### GET /api/chat/conversations

List chat conversations by tab.

**Query Parameters:**
- `tab` - Filter by tab (`ai`, `staff`, `queued`, `closed`)
- `limit` (optional) - Number of results (default: 50)

**Response:**
```json
{
  "data": {
    "conversations": [
      {
        "id": "conv_abc123",
        "ticket_id": "tkt_xyz789",
        "ticket_number": "TKT-000178",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "status": "ai_handling",
        "assigned_to": "ai-agent-001",
        "assigned_staff_first_name": "McCarthy",
        "assigned_staff_last_name": "AI",
        "priority": "normal",
        "sentiment": "neutral",
        "last_message": "What are the heat settings for DTF?",
        "message_count": 5,
        "started_at": "2025-12-05T10:00:00Z",
        "last_message_at": "2025-12-05T10:05:00Z"
      }
    ]
  }
}
```

---

#### POST /api/chat/start

Start a new chat conversation.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I have a question about my order"
}
```

**Response:**
```json
{
  "data": {
    "conversationId": "conv_abc123",
    "ticketId": "tkt_xyz789",
    "customerId": "cust_def456",
    "aiResponse": "Hi John! 👋 I'm McCarthy AI, your virtual assistant. How can I help you today?"
  }
}
```

---

#### POST /api/chat/message

Send a message in a chat conversation.

**Request:**
```json
{
  "conversationId": "conv_abc123",
  "message": "What are the heat settings for DTF transfers?",
  "customerId": "cust_def456"
}
```

**Response:**
```json
{
  "data": {
    "messageId": "msg_xyz789",
    "aiResponse": "For DTF transfers, the recommended heat press settings are:\n\n- **Temperature**: 150-160°C (302-320°F)\n- **Pressure**: Medium to firm\n- **Time**: 8-12 seconds\n- **Peel**: Hot peel (within 2-10 seconds)"
  }
}
```

---

#### POST /api/chat/conversations/:id/takeover

Staff takes over a conversation from AI.

**Response:**
```json
{
  "data": {
    "success": true,
    "conversation": {
      "id": "conv_abc123",
      "status": "staff_handling",
      "assigned_to": "usr_xyz789"
    }
  }
}
```

---

#### POST /api/chat/conversations/:id/pickup

Staff picks up a queued conversation.

**Response:**
```json
{
  "data": {
    "success": true,
    "conversation": {
      "id": "conv_abc123",
      "status": "staff_handling",
      "assigned_to": "usr_xyz789"
    }
  }
}
```

---

#### POST /api/chat/conversations/:id/close

Close a chat conversation.

**Request:**
```json
{
  "resolutionType": "staff_resolved"
}
```

**Valid resolution types:** `ai_resolved`, `staff_resolved`, `inactive_closed`, `abandoned`

**Response:**
```json
{
  "data": {
    "success": true,
    "conversation": {
      "id": "conv_abc123",
      "status": "closed",
      "resolution_type": "staff_resolved",
      "closed_at": "2025-12-05T10:30:00Z"
    }
  }
}
```

---

#### POST /api/chat/conversations/:id/reassign

Reassign a conversation to another staff member or back to AI.

**Request:**
```json
{
  "assignedTo": "usr_abc123",
  "reason": "Specialist knowledge required"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "conversation": {
      "id": "conv_abc123",
      "assigned_to": "usr_abc123",
      "status": "staff_handling"
    }
  }
}
```

---

## 8. AI AGENT CONFIGURATION APIs

### RAG Knowledge

#### GET /api/ai-agent/knowledge

List all RAG knowledge documents.

**Response:**
```json
{
  "data": {
    "documents": [
      {
        "id": "doc_abc123",
        "title": "DTF Application Guide",
        "filename": "dtf-guide.md",
        "category": "products",
        "word_count": 1250,
        "created_at": "2025-12-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST /api/ai-agent/knowledge

Upload a new RAG document.

**Request (multipart/form-data):**
- `file` - The document file (.md, .txt, .pdf)
- `title` - Document title
- `category` - Category (policies, products, faq, general, other)

**Response:**
```json
{
  "data": {
    "document": {
      "id": "doc_xyz789",
      "title": "Return Policy",
      "filename": "return-policy.md",
      "category": "policies",
      "word_count": 500,
      "created_at": "2025-12-05T10:00:00Z"
    }
  }
}
```

---

#### DELETE /api/ai-agent/knowledge/:id

Delete a RAG document.

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

### System Message

#### GET /api/ai-agent/system-message

Get the AI system message configuration.

**Response:**
```json
{
  "data": {
    "config": {
      "role": "You are McCarthy AI, a helpful customer service assistant...",
      "personality": "Friendly, professional, and knowledgeable",
      "responsibilities": "Answer customer questions, help with orders...",
      "dos": "Be helpful, use RAG knowledge, escalate when unsure",
      "donts": "Don't make up information, don't promise things you can't deliver",
      "tone_of_voice": "Warm and professional with occasional emojis",
      "custom_instructions": "Always check RAG documents first"
    }
  }
}
```

---

#### PUT /api/ai-agent/system-message

Update the AI system message configuration.

**Request:**
```json
{
  "role": "You are McCarthy AI...",
  "personality": "Friendly and helpful",
  "responsibilities": "...",
  "dos": "...",
  "donts": "...",
  "tone_of_voice": "...",
  "custom_instructions": "..."
}
```

---

### Widget Settings

#### GET /api/ai-agent/widget-settings

Get chat widget settings.

**Response:**
```json
{
  "data": {
    "settings": {
      "primary_color": "#4F46E5",
      "secondary_color": "#EEF2FF",
      "text_color": "#1F2937",
      "welcome_message": "Hi! 👋 How can I help you today?",
      "offline_message": "We're currently offline. Please leave a message.",
      "button_text": "Chat with us",
      "agent_name": "McCarthy AI",
      "position": "bottom-right"
    }
  }
}
```

---

#### PUT /api/ai-agent/widget-settings

Update chat widget settings.

---

#### GET /api/ai-agent/embed-code

Get the embed code for the chat widget.

**Response:**
```json
{
  "data": {
    "embedCode": "<script src=\"https://dartmouth-os-worker.dartmouth.workers.dev/chat-widget.js\" data-tenant=\"default\"></script>"
  }
}
```

---

## 9. AUTO-ASSIGNMENT APIs

### Configuration

#### GET /api/auto-assignment/config

Get auto-assignment configuration.

**Response:**
```json
{
  "data": {
    "config": {
      "enabled": true,
      "mode": "round_robin",
      "max_tickets_per_staff": 8,
      "refill_threshold": 3,
      "priority_order": "high_first",
      "business_hours_only": true,
      "exclude_ai_tickets": false
    }
  }
}
```

---

#### PUT /api/auto-assignment/config

Update auto-assignment configuration.

**Request:**
```json
{
  "enabled": true,
  "max_tickets_per_staff": 10,
  "refill_threshold": 5
}
```

---

#### POST /api/auto-assignment/run

Manually trigger auto-assignment.

**Response:**
```json
{
  "data": {
    "assigned": 5,
    "skipped": 2,
    "details": [
      {
        "ticketId": "tkt_abc123",
        "assignedTo": "usr_xyz789",
        "reason": "lowest_count"
      }
    ]
  }
}
```

---

#### GET /api/auto-assignment/history

Get auto-assignment audit log.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": {
    "history": [
      {
        "id": "log_abc123",
        "ticket_id": "tkt_xyz789",
        "assigned_to": "usr_def456",
        "assigned_by": "system",
        "reason": "round_robin",
        "created_at": "2025-12-05T10:00:00Z"
      }
    ]
  }
}
```

---

#### GET /api/auto-assignment/staff/:id

Get per-staff auto-assignment settings.

**Response:**
```json
{
  "data": {
    "staff": {
      "id": "usr_abc123",
      "auto_assignment_opt_out": false,
      "current_ticket_count": 5,
      "max_tickets": 8
    }
  }
}
```

---

#### PUT /api/auto-assignment/staff/:id

Update per-staff auto-assignment settings.

**Request:**
```json
{
  "optOut": true
}
```

---

## 10. INTEGRATION APIs

### Shopify Integration (Planned)

#### GET /api/v2/integrations/shopify/orders/:orderId

Get order details from Shopify.

**Response:**
```json
{
  "data": {
    "order": {
      "id": "12345",
      "orderNumber": "#1001",
      "customer": {
        "email": "customer@example.com",
        "name": "John Doe"
      },
      "status": "in_production",
      "totalPrice": 150.00,
      "currency": "AUD",
      "lineItems": [...],
      "createdAt": "2025-12-01T10:00:00Z"
    }
  }
}
```

---

## 11. ADMIN APIs

### Business Hours

#### GET /api/business-hours

Get business hours configuration.

**Response:**
```json
{
  "data": {
    "hours": {
      "monday": { "open": "09:00", "close": "17:00", "is_open": true },
      "tuesday": { "open": "09:00", "close": "17:00", "is_open": true },
      "wednesday": { "open": "09:00", "close": "17:00", "is_open": true },
      "thursday": { "open": "09:00", "close": "17:00", "is_open": true },
      "friday": { "open": "09:00", "close": "17:00", "is_open": true },
      "saturday": { "open": "10:00", "close": "14:00", "is_open": true },
      "sunday": { "open": null, "close": null, "is_open": false }
    },
    "timezone": "Australia/Brisbane"
  }
}
```

---

#### PUT /api/business-hours

Update business hours configuration.

---

### Tenant Settings (Dartmouth OS Settings)

#### GET /api/settings/tenant

Get tenant-level settings.

**Response:**
```json
{
  "data": {
    "settings": {
      "business_name": "Direct to Film Australia",
      "business_email": "info@directtofilm.com.au",
      "business_phone": "+61 7 1234 5678",
      "business_address": "Brisbane, QLD, Australia",
      "business_website": "https://directtofilm.com.au",
      "timezone": "Australia/Brisbane",
      "language": "en-AU",
      "measurement_system": "metric",
      "currency": "AUD",
      "date_format": "DD/MM/YYYY",
      "time_format": "12h"
    }
  }
}
```

---

#### PUT /api/settings/tenant

Update tenant-level settings.

---

## 12. WEBSOCKET PROTOCOL

### Connection

```javascript
const socket = io('wss://api.dartmouth-os.com', {
  auth: {
    token: accessToken
  }
});
```

### Events

**Client → Server:**
```javascript
// Join ticket room (for real-time updates)
socket.emit('join-ticket', { ticketId: 'tkt_abc123' });

// Leave ticket room
socket.emit('leave-ticket', { ticketId: 'tkt_abc123' });

// Typing indicator
socket.emit('typing', { ticketId: 'tkt_abc123', isTyping: true });
```

**Server → Client:**
```javascript
// New message in ticket
socket.on('ticket-message', (data) => {
  console.log(data.message); // New message object
});

// Ticket status changed
socket.on('ticket-status-changed', (data) => {
  console.log(data.ticketId, data.newStatus);
});
```

---

## 13. ERROR HANDLING

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "meta": {
    "timestamp": "2025-12-02T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 14. RATE LIMITING

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| **Auth endpoints** | 5 requests | 1 minute |
| **Agent chat** | 10 requests | 1 minute |
| **Tickets (read)** | 100 requests | 1 minute |
| **Tickets (write)** | 20 requests | 1 minute |
| **Admin endpoints** | 50 requests | 1 minute |

---

## 15. API VERSIONING

### Version Strategy

- **URL-based versioning:** `/api/v1`, `/api/v2`, `/api/v3`
- **Backward compatibility:** v1 supported for 12 months after v2 release
- **Deprecation warnings:** Returned in response headers

---

## 📊 API STATUS SUMMARY

### Current Implementation Status

| API Section | Status | Completion |
|-------------|--------|------------|
| **Auth** | ✅ Complete | 100% |
| **Core Platform** | ✅ Complete | 100% |
| **McCarthy Artwork Agent** | ✅ Complete | 100% |
| **Customer Service Agent** | ✅ Complete & Integrated | 100% |
| **Sales Agent** | ❌ Not Built | 0% |
| **PA Agent** | 🚧 In Development | 20% |
| **Customer Service APIs** | ✅ Complete | 100% |
| **AI Draft Responses** | ✅ Complete | 100% |
| **Live Chat APIs** | ✅ Complete | 100% |
| **Auto-Assignment APIs** | ✅ Complete | 100% |
| **RAG Knowledge APIs** | ✅ Complete | 100% |
| **System Message APIs** | ✅ Complete | 100% |
| **Business Hours APIs** | ✅ Complete | 100% |
| **Tenant Settings APIs** | ✅ Complete | 100% |
| **Shopify Integration** | ❌ Not Built | 0% |
| **PERP Integration** | ❌ Not Built | 0% |
| **Admin APIs** | 🟡 Partial | 80% |
| **WebSocket** | 🚧 Planned | 10% |

---

**Document Version:** 3.0  
**Created:** December 2, 2025  
**Last Updated:** December 5, 2025  
**Author:** AI Assistant  
**Status:** Living Document

---

**🌐 MCCARTHY AI DARTMOUTH OS - UNIFIED API ARCHITECTURE**
