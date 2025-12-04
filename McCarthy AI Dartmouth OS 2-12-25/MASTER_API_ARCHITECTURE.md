# 🌐 MCCARTHY AI DARTMOUTH OS - MASTER API ARCHITECTURE

**Version:** 2.1  
**Date:** December 5, 2025  
**Status:** Active Development - 94% Complete  
**Document Type:** Unified API Specification

---

## 📋 TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [API Design Principles](#2-api-design-principles)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Core Platform APIs](#4-core-platform-apis)
5. [Agent APIs](#5-agent-apis)
6. [Customer Service APIs](#6-customer-service-apis)
7. [Integration APIs](#7-integration-apis)
8. [Admin APIs](#8-admin-apis)
9. [WebSocket Protocol](#9-websocket-protocol)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)
12. [API Versioning](#12-api-versioning)

---

## 1. OVERVIEW

### Purpose

This document defines the **complete API architecture** for McCarthy AI Dartmouth OS, covering:

- **Core Platform APIs** - Health, monitoring, analytics
- **Agent APIs** - McCarthy Artwork, Customer Service, Sales, PA
- **Customer Service APIs** - Tickets, staff, mentions
- **Integration APIs** - Shopify, PERP, Stripe, Twilio
- **Admin APIs** - Tenant management, settings, permissions

### Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.dartmouth-os.com` |
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

**Status Codes:**
- `200` - Success
- `401` - Invalid credentials
- `403` - Account locked

---

#### POST /api/v2/auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
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
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  }
}
```

**Status Codes:**
- `201` - Success
- `400` - Invalid email or password
- `409` - Email already exists

---

#### POST /api/v2/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid or expired refresh token

---

#### POST /api/v2/auth/logout

Logout and invalidate tokens.

**Headers:**
```http
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

#### GET /api/v2/auth/me

Get current user information.

**Headers:**
```http
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "john@dtf.com.au",
    "firstName": "John",
    "lastName": "Hutchison",
    "role": "admin",
    "permissions": ["*"],
    "isActive": true,
    "isAvailable": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-02T10:00:00Z"
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
| **user** | `tickets:own` | View own tickets only |

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

**Status Codes:**
- `200` - All systems operational
- `503` - One or more services down

---

#### GET /health/ready

Readiness check for load balancers.

**Response:**
```json
{
  "ready": true,
  "timestamp": "2025-12-02T10:00:00Z"
}
```

---

#### GET /health/live

Liveness check for orchestrators.

**Response:**
```json
{
  "alive": true,
  "timestamp": "2025-12-02T10:00:00Z"
}
```

---

### Analytics

#### GET /api/v2/analytics/overview

Get system-wide analytics.

**Headers:**
```http
Authorization: Bearer {accessToken}
```

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
      "escalationRate": 0.25
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

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

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

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `404` - Agent not found
- `429` - Rate limit exceeded
- `500` - Server error

---

### McCarthy Artwork Agent

#### POST /api/v2/agents/mccarthy-artwork/chat

**Specialized endpoint for artwork agent.**

**Request:**
```json
{
  "message": "What's the DPI at 28.5cm wide?",
  "sessionId": "sess_abc123",
  "artworkData": {
    "width": 2811,
    "height": 2539,
    "dpi": 300,
    "colorMode": "RGB",
    "hasTransparency": true,
    "iccProfile": null
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
      "intent": "calculate_dpi",
      "confidence": 0.95,
      "handler": "SizeCalculationHandler",
      "calculation": {
        "width": 28.5,
        "unit": "cm",
        "dpi": 251,
        "quality": "optimal"
      }
    }
  }
}
```

---

### Customer Service Agent

#### POST /api/v2/agents/customer-service/chat

**Specialized endpoint for customer service agent.**

**Request:**
```json
{
  "message": "Where is my order #12345?",
  "sessionId": "sess_abc123",
  "customerId": "cust_abc123"
}
```

**Response:**
```json
{
  "data": {
    "content": "Your order #12345 is currently in production and will be ready for shipping tomorrow. You'll receive a tracking number within 24 hours.",
    "metadata": {
      "sessionId": "sess_abc123",
      "intent": "order_status",
      "confidence": 0.92,
      "handler": "OrderStatusHandler",
      "shopifyData": {
        "orderId": "12345",
        "status": "in_production",
        "estimatedShipDate": "2025-12-03"
      }
    }
  }
}
```

---

### Sales Agent

#### POST /api/v2/agents/sales-agent/chat

**Specialized endpoint for sales agent.**

**Request:**
```json
{
  "message": "How much for 100 custom t-shirts?",
  "sessionId": "sess_abc123"
}
```

**Response:**
```json
{
  "data": {
    "content": "100 custom t-shirts: **$1,485** (inc GST)\n\nBreakdown:\n- Base: $1,500\n- Volume discount (10%): -$150\n- Subtotal: $1,350\n- GST (10%): $135\n- **Total: $1,485**\n\nWould you like a formal quote?",
    "metadata": {
      "sessionId": "sess_abc123",
      "intent": "pricing_inquiry",
      "confidence": 0.95,
      "handler": "PricingHandler",
      "pricing": {
        "quantity": 100,
        "unitPrice": 15.00,
        "subtotal": 1500.00,
        "discount": 150.00,
        "tax": 135.00,
        "total": 1485.00,
        "currency": "AUD"
      }
    }
  }
}
```

---

### PA Agent (McCarthy PA)

**⚠️ IMPORTANT: PA Agent API is UNCHANGED - Developer is using this specification**

#### POST /api/v2/agents/mccarthy-pa/chat

Send a text message to McCarthy PA.

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request:**
```json
{
  "message": "Remind me to call John at 3pm",
  "sessionId": "session123"
}
```

**Response:**
```json
{
  "response": "Got it! I'll remind you to call John at 3pm",
  "intent": "create_reminder",
  "entities": {
    "contact": "John",
    "time": "15:00"
  },
  "sessionId": "session123"
}
```

---

#### POST /api/v2/agents/mccarthy-pa/voice

Send voice input to McCarthy PA.

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: audio/webm
```

**Request:**
```
<audio binary data>
```

**Response:**
```json
{
  "transcript": "Remind me to call John at 3pm",
  "response": "Got it! I'll remind you to call John at 3pm",
  "audioUrl": "https://r2.dartmouth-os.com/audio/response123.wav",
  "intent": "create_reminder",
  "entities": {
    "contact": "John",
    "time": "15:00"
  }
}
```

---

#### WebSocket /api/v2/agents/mccarthy-pa/voice/stream

Real-time voice streaming.

**Connection:**
```javascript
const socket = io('wss://api.dartmouth-os.com', {
  auth: { token: accessToken }
});
```

**Events:**

**Client → Server:**
```javascript
// Send audio chunk
socket.emit('audio-chunk', { audio: audioBuffer, final: false });

// Send final audio chunk
socket.emit('audio-chunk', { audio: audioBuffer, final: true });
```

**Server → Client:**
```javascript
// Receive transcript
socket.on('transcript', (data) => {
  console.log(data.text); // "Remind me to call John at 3pm"
});

// Receive audio response
socket.on('audio-response', (data) => {
  playAudio(data.audio); // ArrayBuffer
});
```

---

#### GET /api/v2/agents/mccarthy-pa/tasks

Get all tasks for the authenticated user.

**Headers:**
```http
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `status` (optional) - Filter by status (`pending`, `completed`)
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "tasks": [
    {
      "id": "task123",
      "title": "Call John",
      "description": "Discuss project timeline",
      "status": "pending",
      "priority": "high",
      "dueDate": "2025-12-02T15:00:00Z",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /api/v2/agents/mccarthy-pa/tasks

Create a new task.

**Request:**
```json
{
  "title": "Call John",
  "description": "Discuss project timeline",
  "priority": "high",
  "dueDate": "2025-12-02T15:00:00Z"
}
```

**Response:**
```json
{
  "task": {
    "id": "task123",
    "title": "Call John",
    "description": "Discuss project timeline",
    "status": "pending",
    "priority": "high",
    "dueDate": "2025-12-02T15:00:00Z",
    "createdAt": "2025-12-02T10:00:00Z"
  }
}
```

---

#### PUT /api/v2/agents/mccarthy-pa/tasks/:id

Update a task.

**Request:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "task": {
    "id": "task123",
    "title": "Call John",
    "status": "completed",
    "completedAt": "2025-12-02T15:30:00Z"
  }
}
```

---

#### DELETE /api/v2/agents/mccarthy-pa/tasks/:id

Delete a task.

**Response:**
```json
{
  "success": true
}
```

---

**📝 NOTE: Full PA Agent API specification preserved at:**
`docs/agents/mccarthy-pa/v8/MCCARTHY_PA_API_REFERENCE.md`

---

### PerfectPrint AI (In Development)

**⚠️ NOTE: PerfectPrint AI is currently in active development (Phase 0 - 85% complete)**

PerfectPrint AI is a separate product that integrates with Dartmouth OS for automated artwork preparation.

#### POST /api/v2/perfectprint/process

Process artwork through the 7-step pipeline.

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request:**
```
file: <image file> (PNG/JPG)
options: {
  "upscale": true,
  "removeBackground": true,
  "removeShadow": true,
  "fixTransparency": true,
  "vectorize": "auto",  // auto, force, never
  "halftone": false,
  "fadeToFabric": false
}
```

**Response:**
```json
{
  "data": {
    "jobId": "job_abc123",
    "status": "processing",
    "estimatedTime": 15,
    "steps": [
      {
        "step": 1,
        "name": "Upscaling",
        "status": "completed",
        "duration": 3.2
      },
      {
        "step": 2,
        "name": "Background Removal",
        "status": "in_progress"
      }
    ]
  }
}
```

**Status Codes:**
- `202` - Accepted, processing started
- `400` - Invalid file format
- `401` - Unauthorized
- `413` - File too large
- `429` - Rate limit exceeded

---

#### GET /api/v2/perfectprint/jobs/:jobId

Get job status and results.

**Response:**
```json
{
  "data": {
    "jobId": "job_abc123",
    "status": "completed",
    "originalFile": "https://r2.../original.png",
    "processedFiles": {
      "cleanedPng": "https://r2.../cleaned.png",
      "vectorSvg": "https://r2.../vector.svg",
      "printReadyPdf": "https://r2.../print.pdf"
    },
    "processingTime": 14.3,
    "steps": [
      {
        "step": 1,
        "name": "Upscaling",
        "status": "completed",
        "method": "Real-ESRGAN",
        "scaleFactor": 2,
        "duration": 3.2
      },
      {
        "step": 2,
        "name": "Background Removal",
        "status": "completed",
        "method": "BRIA-RMBG-2.0",
        "quality": 98,
        "duration": 2.1
      }
    ],
    "metadata": {
      "originalDpi": 150,
      "finalDpi": 300,
      "imageType": "logo",
      "vectorizerUsed": "StarVector"
    }
  }
}
```

---

#### POST /api/v2/perfectprint/batch

Process multiple files in batch.

**Request:**
```
files: [<file1>, <file2>, ...]
preset: "logo" | "t-shirt" | "photo" | "custom"
options: { ... }
```

**Response:**
```json
{
  "data": {
    "batchId": "batch_xyz789",
    "totalFiles": 10,
    "jobs": [
      {
        "jobId": "job_001",
        "filename": "logo1.png",
        "status": "queued"
      }
    ]
  }
}
```

---

**📝 NOTE: PerfectPrint AI API is under development. Full specification at:**
`D:\coding\PerfectPrint AI\API_SPECIFICATION.md`

**Integration Status:** Planned integration with McCarthy Artwork Agent

**Launch Date:** Late January 2026

---

## 6. CUSTOMER SERVICE APIs

### Tickets

#### GET /api/v2/tickets

List tickets with optional filters.

**Headers:**
```http
Authorization: Bearer {accessToken}
```

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
        "ticket_number": "TICK-1001",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe",
        "subject": "Order inquiry",
        "status": "open",
        "priority": "normal",
        "sentiment": "neutral",
        "category": "order_status",
        "platform": "email",
        "assigned_to": "usr_xyz789",
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

#### GET /api/v2/tickets/:id

Get single ticket with messages and notes.

**Response:**
```json
{
  "data": {
    "ticket": {
      "ticket_id": "tkt_abc123",
      "ticket_number": "TICK-1001",
      "customer_email": "customer@example.com",
      "customer_name": "John Doe",
      "subject": "Order inquiry",
      "description": "Where is my order #12345?",
      "status": "open",
      "priority": "normal",
      "sentiment": "neutral",
      "category": "order_status",
      "platform": "email",
      "assigned_to": "usr_xyz789",
      "created_at": "2025-12-02T10:00:00Z",
      "updated_at": "2025-12-02T10:00:00Z"
    },
    "messages": [
      {
        "id": "msg_001",
        "ticket_id": "tkt_abc123",
        "sender_type": "customer",
        "sender_name": "John Doe",
        "content": "Where is my order #12345?",
        "was_scheduled": false,
        "created_at": "2025-12-02T10:00:00Z"
      },
      {
        "id": "msg_002",
        "ticket_id": "tkt_abc123",
        "sender_type": "agent",
        "sender_id": "usr_xyz789",
        "sender_name": "John Hutchison",
        "content": "Your order is in production...",
        "was_scheduled": false,
        "created_at": "2025-12-02T10:05:00Z"
      }
    ],
    "notes": [
      {
        "id": "note_001",
        "ticket_id": "tkt_abc123",
        "staff_id": "usr_xyz789",
        "staff_name": "John Hutchison",
        "content": "Customer called, very happy",
        "note_type": "general",
        "created_at": "2025-12-02T10:10:00Z"
      }
    ]
  }
}
```

---

#### POST /api/v2/tickets

Create a new ticket.

**Request:**
```json
{
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "subject": "Order inquiry",
  "description": "Where is my order #12345?",
  "platform": "email",
  "priority": "normal"
}
```

**Response:**
```json
{
  "data": {
    "ticket": {
      "ticket_id": "tkt_abc123",
      "ticket_number": "TICK-1001",
      "customer_email": "customer@example.com",
      "customer_name": "John Doe",
      "subject": "Order inquiry",
      "status": "open",
      "priority": "normal",
      "sentiment": "neutral",
      "created_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid request
- `401` - Unauthorized

---

#### PUT /api/v2/tickets/:id/assign

Assign ticket to staff member.

**Request:**
```json
{
  "assignedTo": "usr_xyz789"
}
```

**Response:**
```json
{
  "data": {
    "ticket": {
      "ticket_id": "tkt_abc123",
      "assigned_to": "usr_xyz789",
      "updated_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

#### PUT /api/v2/tickets/:id/status

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
  "data": {
    "ticket": {
      "ticket_id": "tkt_abc123",
      "status": "resolved",
      "updated_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

#### POST /api/v2/tickets/:id/reply

Reply to ticket.

**Request:**
```json
{
  "content": "Your order is in production and will ship tomorrow."
}
```

**Response:**
```json
{
  "data": {
    "message": {
      "id": "msg_002",
      "ticket_id": "tkt_abc123",
      "sender_type": "agent",
      "sender_id": "usr_xyz789",
      "content": "Your order is in production...",
      "created_at": "2025-12-02T10:05:00Z"
    }
  }
}
```

---

#### POST /api/v2/tickets/:id/schedule-reply

Schedule a reply for later.

**Request:**
```json
{
  "content": "Following up on your order...",
  "scheduledFor": "2025-12-03T09:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "scheduledMessage": {
      "id": "sched_001",
      "ticket_id": "tkt_abc123",
      "content": "Following up on your order...",
      "scheduled_for": "2025-12-03T09:00:00Z",
      "status": "pending",
      "created_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

#### POST /api/v2/tickets/:id/notes

Add internal note to ticket.

**Request:**
```json
{
  "content": "Customer called, very happy with service",
  "noteType": "general"
}
```

**Response:**
```json
{
  "data": {
    "note": {
      "id": "note_001",
      "ticket_id": "tkt_abc123",
      "staff_id": "usr_xyz789",
      "content": "Customer called, very happy with service",
      "note_type": "general",
      "created_at": "2025-12-02T10:10:00Z"
    }
  }
}
```

---

### AI Draft Responses (NEW - Phase 1)

#### GET /api/v2/tickets/:id/ai-draft

Get AI-generated draft response for ticket.

**Response:**
```json
{
  "data": {
    "draft": {
      "id": "draft_001",
      "ticket_id": "tkt_abc123",
      "draft_content": "Your order #12345 is currently in production...",
      "confidence_score": 0.85,
      "intent": "order_status",
      "handler_used": "OrderStatusHandler",
      "reasoning": "High confidence - order found in Shopify, production status confirmed in PERP",
      "suggested_actions": ["Send immediately", "Add tracking link when available"],
      "shopify_data": {
        "orderId": "12345",
        "status": "in_production"
      },
      "status": "pending",
      "created_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

**Status Codes:**
- `200` - Draft found
- `404` - No draft available

---

#### POST /api/v2/tickets/:id/ai-draft/approve

Approve and send AI draft response.

**Response:**
```json
{
  "data": {
    "message": {
      "id": "msg_002",
      "ticket_id": "tkt_abc123",
      "sender_type": "agent",
      "sender_id": "ai-agent-001",
      "content": "Your order #12345 is currently in production...",
      "created_at": "2025-12-02T10:05:00Z"
    },
    "draft": {
      "id": "draft_001",
      "status": "approved",
      "approved_by": "usr_xyz789",
      "approved_at": "2025-12-02T10:05:00Z"
    }
  }
}
```

---

#### POST /api/v2/tickets/:id/ai-draft/edit

Edit and send AI draft response.

**Request:**
```json
{
  "editedContent": "Your order #12345 is currently in production and will ship tomorrow. You'll receive tracking within 24 hours."
}
```

**Response:**
```json
{
  "data": {
    "message": {
      "id": "msg_002",
      "ticket_id": "tkt_abc123",
      "sender_type": "agent",
      "sender_id": "usr_xyz789",
      "content": "Your order #12345 is currently in production...",
      "created_at": "2025-12-02T10:05:00Z"
    },
    "draft": {
      "id": "draft_001",
      "status": "edited",
      "approved_by": "usr_xyz789",
      "edited_content": "Your order #12345 is currently in production...",
      "approved_at": "2025-12-02T10:05:00Z"
    }
  }
}
```

---

#### POST /api/v2/tickets/:id/ai-draft/reject

Reject AI draft response.

**Request:**
```json
{
  "reason": "Incorrect information - order is not in production"
}
```

**Response:**
```json
{
  "data": {
    "draft": {
      "id": "draft_001",
      "status": "rejected",
      "rejected_by": "usr_xyz789",
      "rejection_reason": "Incorrect information - order is not in production",
      "rejected_at": "2025-12-02T10:05:00Z"
    }
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
        "is_active": true,
        "is_available": true,
        "created_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": "ai-agent-001",
        "email": "ai-agent@dtf.com.au",
        "first_name": "AI",
        "last_name": "Agent",
        "role": "agent",
        "is_active": true,
        "is_available": true,
        "is_ai": true,
        "created_at": "2025-12-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### GET /api/v2/staff/:id

Get single staff member details.

**Response:**
```json
{
  "data": {
    "staff": {
      "id": "usr_abc123",
      "email": "john@dtf.com.au",
      "first_name": "John",
      "last_name": "Hutchison",
      "role": "admin",
      "is_active": true,
      "is_available": true,
      "created_at": "2025-01-01T00:00:00Z",
      "stats": {
        "totalTickets": 250,
        "openTickets": 15,
        "resolvedTickets": 235,
        "averageResponseTime": 245
      }
    }
  }
}
```

---

#### PUT /api/v2/staff/:id/presence

Update staff availability status.

**Request:**
```json
{
  "isAvailable": true
}
```

**Response:**
```json
{
  "data": {
    "staff": {
      "id": "usr_abc123",
      "is_available": true,
      "updated_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

## 7. INTEGRATION APIs

### Shopify Integration (Phase 3)

#### GET /api/v2/integrations/shopify/products

Get products from Shopify.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": {
    "products": [
      {
        "id": "prod_123",
        "title": "Custom T-Shirt",
        "price": 15.00,
        "currency": "AUD",
        "inventory": 500,
        "variants": [
          {
            "id": "var_456",
            "title": "Small",
            "price": 15.00,
            "inventory": 100
          }
        ]
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

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
      "lineItems": [
        {
          "productId": "prod_123",
          "title": "Custom T-Shirt",
          "quantity": 10,
          "price": 15.00
        }
      ],
      "createdAt": "2025-12-01T10:00:00Z",
      "estimatedShipDate": "2025-12-03T00:00:00Z"
    }
  }
}
```

---

### PERP Integration (Phase 3)

#### GET /api/v2/integrations/perp/production/:orderId

Get production status from PERP.

**Response:**
```json
{
  "data": {
    "production": {
      "orderId": "12345",
      "status": "in_production",
      "artworkStatus": "approved",
      "productionStage": "printing",
      "estimatedCompletion": "2025-12-03T00:00:00Z",
      "assignedTo": "Production Team A"
    }
  }
}
```

---

#### GET /api/v2/integrations/perp/invoices/:invoiceId

Get invoice from PERP.

**Response:**
```json
{
  "data": {
    "invoice": {
      "id": "inv_123",
      "invoiceNumber": "INV-1001",
      "customerId": "cust_456",
      "totalAmount": 150.00,
      "currency": "AUD",
      "status": "paid",
      "dueDate": "2025-12-15T00:00:00Z",
      "paidDate": "2025-12-01T10:00:00Z"
    }
  }
}
```

---

## 8. ADMIN APIs

### Settings

#### GET /api/v2/admin/settings

List all system settings.

**Headers:**
```http
Authorization: Bearer {accessToken}
X-Required-Role: admin
```

**Response:**
```json
{
  "data": {
    "settings": [
      {
        "key": "ai_response_mode",
        "value": "draft",
        "type": "string",
        "description": "AI response mode: auto or draft"
      },
      {
        "key": "auto_escalation_enabled",
        "value": "true",
        "type": "boolean",
        "description": "Enable automatic escalation"
      }
    ]
  }
}
```

---

#### PUT /api/v2/admin/settings/:key

Update setting value.

**Request:**
```json
{
  "value": "auto"
}
```

**Response:**
```json
{
  "data": {
    "setting": {
      "key": "ai_response_mode",
      "value": "auto",
      "updated_at": "2025-12-02T10:00:00Z"
    }
  }
}
```

---

## 9. WEBSOCKET PROTOCOL

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

// Staff typing indicator
socket.on('staff-typing', (data) => {
  console.log(data.staffName, data.isTyping);
});
```

---

## 10. ERROR HANDLING

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Must be a valid email address"
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
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

---

## 11. RATE LIMITING

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| **Auth endpoints** | 5 requests | 1 minute |
| **Agent chat** | 10 requests | 1 minute |
| **Tickets (read)** | 100 requests | 1 minute |
| **Tickets (write)** | 20 requests | 1 minute |
| **Admin endpoints** | 50 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701518400
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2025-12-02T10:01:00Z"
    }
  }
}
```

---

## 12. API VERSIONING

### Version Strategy

- **URL-based versioning:** `/api/v1`, `/api/v2`, `/api/v3`
- **Backward compatibility:** v1 supported for 12 months after v2 release
- **Deprecation warnings:** Returned in response headers

### Deprecation Header

```http
X-API-Deprecation: This endpoint is deprecated and will be removed on 2026-12-31
X-API-Sunset: 2026-12-31T00:00:00Z
X-API-Replacement: /api/v3/tickets
```

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
| **PerfectPrint AI** | 🚧 In Development | 5% |
| **Customer Service APIs** | ✅ Complete | 100% |
| **AI Draft Responses** | ✅ Complete | 100% |
| **Live Chat APIs** | ✅ Complete | 100% |
| **Auto-Assignment APIs** | ✅ Complete | 100% |
| **RAG Knowledge APIs** | ✅ Complete | 100% |
| **System Message APIs** | ✅ Complete | 100% |
| **Shopify Integration** | ❌ Not Built | 0% |
| **PERP Integration** | ❌ Not Built | 0% |
| **Admin APIs** | 🟡 Partial | 70% |
| **WebSocket** | ❌ Not Built | 0% |

### New APIs Added (Dec 4-5, 2025)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/conversations` | GET | List chat conversations by tab |
| `/api/chat/conversations/:id/takeover` | POST | Staff takes over from AI |
| `/api/chat/conversations/:id/pickup` | POST | Staff picks up from queue |
| `/api/chat/conversations/:id/close` | POST | Close conversation |
| `/api/chat/conversations/:id/reassign` | POST | Reassign to staff/AI |
| `/api/chat/messages` | GET/POST | Get/send chat messages |
| `/api/auto-assignment/config` | GET/PUT | Auto-assignment settings |
| `/api/auto-assignment/run` | POST | Manually trigger assignment |
| `/api/auto-assignment/history` | GET | Assignment audit log |
| `/api/auto-assignment/staff/:id` | GET/PUT | Per-staff settings |
| `/api/ai-agent/knowledge` | GET/POST/DELETE | RAG documents |
| `/api/ai-agent/system-message` | GET/PUT | System message config |
| `/api/ai-agent/widget-settings` | GET/PUT | Chat widget config |
| `/api/ai-agent/embed-code` | GET | Get embed script |

---

## 🚨 CRITICAL NOTES

### PA Agent API - DO NOT CHANGE

**⚠️ The PA Agent API specification is UNCHANGED and must remain as-is.**

- Developer is currently building against this spec
- Any changes will break their development
- Full specification: `docs/agents/mccarthy-pa/v8/MCCARTHY_PA_API_REFERENCE.md`

### No Fundamental Design Flaws Detected

After reviewing the PA Agent API, **no critical design flaws were found**. The API is:
- ✅ Well-structured
- ✅ RESTful
- ✅ Consistent with other agent APIs
- ✅ Supports both text and voice
- ✅ Includes WebSocket for real-time streaming

---

## 📚 ADDITIONAL RESOURCES

### Related Documentation

- **System Blueprint:** `DARTMOUTH_OS_BLUEPRINT_2025.md`
- **Build Plan:** `MASTER_BUILD_PLAN_DEC_2_2025.md`
- **Big Picture:** `BIG_PICTURE_DEC_2_2025.md`
- **PA Agent API (Full):** `docs/agents/mccarthy-pa/v8/MCCARTHY_PA_API_REFERENCE.md`

### API Testing

**Postman Collection:** (To be created)  
**API Documentation:** (To be deployed with Swagger/OpenAPI)

---

**Document Version:** 2.1  
**Created:** December 2, 2025  
**Last Updated:** December 5, 2025  
**Author:** AI Assistant  
**Status:** Living Document

---

**🌐 MCCARTHY AI DARTMOUTH OS - UNIFIED API ARCHITECTURE**

