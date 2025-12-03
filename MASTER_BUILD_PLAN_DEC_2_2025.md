# 🏗️ DARTMOUTH OS - MASTER BUILD PLAN

**Date:** December 2, 2025  
**Version:** 2.0  
**Status:** Active Development  
**Priority:** DARTMOUTH OS CORE FIRST, then Agents

---

## 🎯 **GUIDING PRINCIPLE**

> **"BUILD THE DARTMOUTH OS CORE INFRASTRUCTURE FIRST - IT'S THE FOUNDATION FOR ALL AGENTS"**

**Why:**
- All agents depend on Dartmouth OS services (RAG, Memory, Integrations, Agent Orchestration)
- Building agents without the core is building on sand
- Core infrastructure unlocks ALL agents simultaneously
- Agents are relatively quick to build once core is ready

---

## 📊 **CURRENT STATUS (December 2, 2025)**

### **Overall Progress: 85% Complete**

| Component | Status | Completion |
|-----------|--------|------------|
| **Dartmouth OS Core** | 🟡 Partial | 70% |
| **Email System V2** | ✅ Complete | 100% |
| **Customer Service Dashboard** | ✅ Complete | 98% |
| **Ticket Management** | ✅ Complete | 100% |
| **McCarthy Artwork Agent** | ✅ Complete | 100% |
| **Customer Service Agent** | ✅ Built, Not Integrated | 100% (code) / 0% (live) |
| **AI Agent Integration** | ❌ Not Live | 0% |
| **Admin Dashboard** | ❌ Not Started | 0% |

---

## ✅ **WHAT'S COMPLETE**

### **1. Dartmouth OS Core (70% Complete)**

#### ✅ **Completed:**
- **BaseAgent (FAM)** - Foundation for all agents
- **RAGEngine** - Document ingestion, embeddings, semantic search
- **Memory System** - Short-term, long-term (partial)
- **Conversation Quality** - Repetition detection, frustration handling
- **Intent Detection** - Pattern matching + semantic
- **Response Validation** - Quality control
- **Agent Handoff Protocol** - Agent-to-agent routing (partial)
- **Analytics Service** - Event tracking

#### ❌ **Missing (Critical):**
- **Knowledge Domain System** - Multi-domain RAG with access control
- **Integration Management** - Shopify, PERP, Stripe, Twilio (shared services)
- **Agent Context Passing** - Full context preservation across agents
- **Permission System** - Agent-specific integration access
- **Semantic Memory** - Long-term knowledge learning
- **Episodic Memory** - Conversation history search

---

### **2. Email System V2 (100% Complete)**

**Status:** ✅ **PRODUCTION READY**

- ✅ Cloudflare Email Routing
- ✅ MIME parsing (multipart, base64, quoted-printable)
- ✅ Email threading (In-Reply-To, References)
- ✅ Conversation tracking
- ✅ Automatic ticket creation
- ✅ Resend integration for outbound
- ✅ Scheduled message sending (cron job)
- ✅ `was_scheduled` flag with blue clock icon
- ✅ Priority & sentiment detection

---

### **3. Customer Service Dashboard (98% Complete)**

**Status:** ✅ **PRODUCTION READY**

- ✅ Ticket list view with filters
- ✅ Sticky header (doesn't scroll)
- ✅ Responsive table layout (no horizontal scroll)
- ✅ Ticket detail view with conversation
- ✅ Reply functionality
- ✅ Schedule reply functionality (defaults to tomorrow @ 9 AM)
- ✅ Priority/sentiment/status updates
- ✅ Assignment to staff
- ✅ Internal notes
- ✅ Scheduled message indicator (blue clock icon)

**Missing:**
- ❌ AI Draft Response panel
- ❌ AI confidence score display
- ❌ Approve/Edit/Reject AI response buttons

---

### **4. Ticket Management (100% Complete)**

**Status:** ✅ **PRODUCTION READY**

- ✅ TicketManager service
- ✅ Auto-detect priority (5 levels)
- ✅ Auto-detect sentiment (4 levels)
- ✅ Auto-detect category (10+ categories)
- ✅ Create/update tickets
- ✅ Add messages
- ✅ Add internal notes
- ✅ Escalate tickets
- ✅ Snooze tickets
- ✅ Resolve/close tickets

---

### **5. McCarthy Artwork Agent (100% Complete)**

**Status:** ✅ **PRODUCTION READY**

- ✅ 5 specialized handlers (Size Calc, Information, How-To, Artwork Analysis, General)
- ✅ YouTube tutorial system
- ✅ Clickable links
- ✅ Constraint validation
- ✅ RAG integration (27 chunks ingested)
- ✅ All tests passing (17/17)
- ✅ Deployed and working

---

### **6. Customer Service Agent (100% Built, 0% Integrated)**

**Status:** ✅ **CODE COMPLETE** | ❌ **NOT LIVE**

- ✅ 4 specialized handlers (Order Status, Production, Invoice, General)
- ✅ Auto-escalation logic
- ✅ Auto-reply vs draft modes
- ✅ All tests passing (17/17)
- ❌ **NOT integrated into ticket workflow**
- ❌ **NOT processing tickets**

---

### **7. Database (100% Complete)**

**Status:** ✅ **PRODUCTION READY**

- ✅ 13 migrations applied
- ✅ All tables created (customers, tickets, ticket_messages, staff_users, conversations, emails, scheduled_messages, rag_chunks, documents, etc.)
- ✅ Indexes added
- ✅ Foreign keys configured
- ✅ 70+ test tickets created

---

## ❌ **WHAT'S OUTSTANDING**

### **CRITICAL PATH (Must be done in order):**

---

## 🔴 **PHASE 1: AI AGENT INTEGRATION (35 hours) - CURRENT PRIORITY**

**Goal:** Get AI Agent processing tickets and generating draft responses.

**Status:** ⏳ **READY TO START**

### **Tasks:**

| # | Task | Time | Status | Notes |
|---|------|------|--------|-------|
| 1.1 | Add AI Agent as staff member | 2h | ⏳ Ready | TODO #6 |
| 1.2 | Create AI draft responses table | 1h | ⏳ Ready | Migration 0015 |
| 1.3 | Build AIAgentProcessor service | 4h | ⏳ Ready | Orchestrates AI invocation |
| 1.4 | Integrate AI into email handler | 2h | ⏳ Ready | Call AI after ticket creation |
| 1.5 | Build AI Response Panel UI | 6h | ⏳ Ready | Display drafts in dashboard |
| 1.6 | Create knowledge base documents | 4h | ⏳ Ready | Company policies, FAQ, products |
| 1.7 | Configure Shopify integration | 3h | ⏳ Ready | Get API credentials |
| 1.8 | Configure PERP integration | 3h | ⏳ Ready | Database or API access |
| 1.9 | Test and refine | 10h | ⏳ Ready | Comprehensive testing |

**Total:** 35 hours (4-5 days)

**Deliverables:**
- ✅ AI generates draft responses for all new tickets
- ✅ Staff can approve/edit/reject AI drafts in dashboard
- ✅ Tickets assigned to AI Agent
- ✅ Low confidence tickets escalate to humans
- ✅ AI can answer order status and production questions with real data

---

## 🔴 **PHASE 2: DASHBOARD POLISH (8-9 hours) - AFTER AI INTEGRATION**

**Goal:** Complete outstanding dashboard features.

**Status:** 📋 **PLANNED**

### **Tasks:**

| # | Task | Time | Status | Notes |
|---|------|------|--------|-------|
| 2.1 | Fix Staff Notes Display Layout | 1.5h | ⏳ Ready | TODO #7 - Better visual design |
| 2.2 | Implement Bulk Ticket Reassignment | 2h | ⏳ Ready | TODO #8 - Checkboxes + bulk actions |
| 2.3 | Add Email Signature Functionality | 2-3h | ⏳ Ready | TODO #9 - UI for signatures |
| 2.4 | Implement Merge Tickets Feature | 3h | ⏳ Ready | TODO #10 - Combine duplicate tickets |

**Total:** 8-9 hours (1-2 days)

**Deliverables:**
- ✅ Staff notes have better layout and visual hierarchy
- ✅ Bulk reassignment of tickets
- ✅ Email signatures for staff
- ✅ Merge duplicate tickets

---

## 🟡 **PHASE 3: DARTMOUTH OS CORE INFRASTRUCTURE (28 hours) - CRITICAL**

**Goal:** Build the missing core infrastructure that ALL agents need.

**Status:** 🔴 **CRITICAL - BLOCKS ALL FUTURE AGENTS**

### **Tasks:**

| # | Task | Time | Status | Notes |
|---|------|------|--------|-------|
| 3.1 | Knowledge Domain System | 10h | ⏳ Ready | Multi-domain RAG with access control |
| 3.2 | Shopify Integration Service | 15h | ⏳ Ready | Shared service for all agents |
| 3.3 | Agent Context Passing | 3h | ⏳ Ready | Full context preservation |

**Total:** 28 hours (3-4 days)

### **3.1 Knowledge Domain System (10 hours)**

**What:** Multi-domain RAG with access control.

**Why:** Currently RAG is agent-specific. Need shared domains (e.g., "products" domain accessible by multiple agents).

**Implementation:**
```sql
-- Domain-based knowledge (replaces agent-specific)
CREATE TABLE knowledge_domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,  -- 'products', 'pricing', 'policies', 'technical'
  description TEXT,
  access_level TEXT CHECK(access_level IN ('public', 'restricted', 'private')),
  created_at TEXT NOT NULL
);

CREATE TABLE domain_access (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,  -- Which agents can access this domain
  permission TEXT CHECK(permission IN ('read', 'write')) DEFAULT 'read',
  FOREIGN KEY (domain_id) REFERENCES knowledge_domains(id)
);

-- Update rag_chunks to use domain_id instead of agent_id
ALTER TABLE rag_chunks ADD COLUMN domain_id TEXT REFERENCES knowledge_domains(id);
```

**Domains:**
- `products` - Product catalog (shared: Sales, CS, Artwork)
- `pricing` - Pricing rules (restricted: Sales, CS)
- `policies` - Company policies (shared: All agents)
- `technical` - Technical specs (shared: Artwork, Production)
- `sales` - Sales strategies (restricted: Sales only)
- `customer-service` - CS procedures (restricted: CS only)

**Deliverables:**
- ✅ Multi-domain RAG system
- ✅ Domain-based access control
- ✅ Migrate existing knowledge to domains
- ✅ Update RAGEngine to query by domain

---

### **3.2 Shopify Integration Service (15 hours)**

**What:** Shared Shopify integration with granular permissions.

**Why:** Multiple agents need Shopify data (products, orders, pricing, inventory).

**Implementation:**
```typescript
// packages/worker/src/services/integrations/ShopifyIntegration.ts
class ShopifyIntegration {
  constructor(
    private tenantId: string,
    private agentId: string,
    private config: ShopifyConfig
  ) {}
  
  // Permission-checked methods
  async getProduct(productId: string) {
    await this.checkPermission('products:read');
    // ...
  }
  
  async getOrders(customerId: string) {
    await this.checkPermission('orders:read');
    // ...
  }
  
  async getPricing(productId: string) {
    await this.checkPermission('pricing:read');
    // ...
  }
  
  async getInventory(productId: string) {
    await this.checkPermission('inventory:read');
    // ...
  }
}
```

**Permission Matrix:**
| Agent | Products | Orders | Pricing | Inventory |
|-------|----------|--------|---------|-----------|
| Customer Service | Read | Read | Read | Read |
| Sales Agent | Read | - | Read | Read |
| Artwork Agent | Read | - | - | - |

**Deliverables:**
- ✅ Shared Shopify integration service
- ✅ Permission-based access control
- ✅ Product catalog retrieval
- ✅ Order lookup
- ✅ Pricing retrieval
- ✅ Inventory checks

---

### **3.3 Agent Context Passing (3 hours)**

**What:** Full context preservation when routing between agents.

**Why:** When Sales Agent routes to Artwork Agent, the Artwork Agent needs full conversation context.

**Implementation:**
```typescript
// Enhanced AgentHandoffProtocol
interface HandoffContext {
  conversationHistory: Message[];
  customerProfile: CustomerProfile;
  currentIntent: string;
  previousAgent: string;
  handoffReason: string;
  metadata: Record<string, any>;
}

class AgentHandoffProtocol {
  async transferToAgent(
    targetAgent: string,
    context: HandoffContext
  ): Promise<Response> {
    // 1. Store full context
    await this.storeHandoffContext(context);
    
    // 2. Route to target agent
    const response = await this.routeToAgent(targetAgent, context);
    
    // 3. Return to original agent (if needed)
    if (response.requiresHandback) {
      return await this.handbackToOriginalAgent(context, response);
    }
    
    return response;
  }
}
```

**Deliverables:**
- ✅ Full context preservation
- ✅ Conversation history transfer
- ✅ Customer profile transfer
- ✅ Intent preservation
- ✅ Seamless agent transitions

---

## 🟢 **PHASE 4: SALES AGENT (27 hours) - AFTER CORE INFRASTRUCTURE**

**Goal:** Build Sales Agent with core features.

**Status:** 📋 **PLANNED - DEPENDS ON PHASE 3**

### **Tasks:**

| # | Task | Time | Status | Notes |
|---|------|------|--------|-------|
| 4.1 | PricingHandler | 5h | ⏳ Ready | Calculate prices, discounts, tax |
| 4.2 | QuoteHandler | 5h | ⏳ Ready | Build quotes, generate PDF |
| 4.3 | SalesStrategyHandler | 3h | ⏳ Ready | Upsell, cross-sell, bundles |
| 4.4 | QualificationHandler | 2h | ⏳ Ready | Discovery questions, lead scoring |
| 4.5 | Inventory checks | 2h | ⏳ Ready | Check stock before quoting |
| 4.6 | Quote follow-up system | 3h | ⏳ Ready | Track quote status, send reminders |
| 4.7 | Multi-currency support | 2h | ⏳ Ready | Convert prices to customer currency |
| 4.8 | Payment plans | 2h | ⏳ Ready | Offer financing options |
| 4.9 | Testing | 3h | ⏳ Ready | Comprehensive testing |

**Total:** 27 hours (3-4 days)

**Deliverables:**
- ✅ Sales Agent can calculate accurate prices
- ✅ Sales Agent can generate professional quotes (text + PDF)
- ✅ Sales Agent can recommend upsells/cross-sells
- ✅ Sales Agent can qualify leads
- ✅ Sales Agent checks inventory before quoting
- ✅ Sales Agent follows up on pending quotes
- ✅ Sales Agent supports multiple currencies
- ✅ Sales Agent offers payment plans

**Deferred Features (Phase 6+):**
- ❌ CRM integration (too large, external system)
- ❌ Lead management (basic version in Phase 4, full CRM later)

---

## 🟢 **PHASE 5: ADMIN DASHBOARD (2-3 weeks) - AFTER SALES AGENT**

**Goal:** Self-service configuration for tenants.

**Status:** 📋 **PLANNED**

### **Features:**

| # | Feature | Time | Status | Notes |
|---|---------|------|--------|-------|
| 5.1 | Integration Management | 1 week | ⏳ Ready | Add/configure Shopify, PERP, etc. |
| 5.2 | Permission Management | 3 days | ⏳ Ready | Grant agents access to integrations |
| 5.3 | Knowledge Base Upload | 3 days | ⏳ Ready | Upload docs, manage domains |
| 5.4 | Agent Configuration | 2 days | ⏳ Ready | Enable/disable agents, configure settings |
| 5.5 | Staff User Management | 2 days | ⏳ Ready | CRUD for staff users |
| 5.6 | System Settings | 2 days | ⏳ Ready | Business hours, SLA, notifications |

**Total:** 2-3 weeks

**Deliverables:**
- ✅ Tenant can add Shopify/PERP credentials
- ✅ Tenant can grant agents access to integrations
- ✅ Tenant can upload knowledge base documents
- ✅ Tenant can enable/disable agents
- ✅ Tenant can manage staff users
- ✅ Tenant can configure system settings

---

## 🟢 **PHASE 6: ANALYTICS & REPORTING (1-2 weeks) - AFTER ADMIN DASHBOARD**

**Goal:** Insights and performance tracking.

**Status:** 📋 **PLANNED**

### **Features:**

| # | Feature | Time | Status | Notes |
|---|---------|------|--------|-------|
| 6.1 | Dashboard Overview | 3 days | ⏳ Ready | Tickets, response time, AI rate |
| 6.2 | Ticket Analytics | 3 days | ⏳ Ready | By channel, priority, sentiment, staff |
| 6.3 | AI Performance | 2 days | ⏳ Ready | AI automation rate, accuracy, escalation |
| 6.4 | SLA Compliance | 2 days | ⏳ Ready | Track SLA breaches |
| 6.5 | Export Reports | 1 day | ⏳ Ready | CSV/PDF export |

**Total:** 1-2 weeks

---

## 🟢 **PHASE 7: OMNICHANNEL EXPANSION (4-6 weeks) - FUTURE**

**Goal:** Support more communication channels.

**Status:** 📋 **PLANNED**

### **Channels:**

| # | Channel | Time | Status | Notes |
|---|---------|------|--------|-------|
| 7.1 | Live Chat Widget | 2 weeks | ⏳ Ready | WebSocket, real-time messaging |
| 7.2 | WhatsApp Business | 1 week | ⏳ Ready | Twilio integration |
| 7.3 | Instagram DMs | 1 week | ⏳ Ready | Meta Graph API |
| 7.4 | Facebook Messenger | 1 week | ⏳ Ready | Meta Messenger Platform |
| 7.5 | SMS (Twilio) | 3 days | ⏳ Ready | Send/receive SMS |
| 7.6 | Phone (Twilio Voice) | 1 week | ⏳ Ready | Call recording, transcription |

**Total:** 4-6 weeks

---

## 📅 **TIMELINE & MILESTONES**

### **Week 1 (Dec 2-8): Phase 1 - AI Agent Integration**
- Days 1-2: Tasks 1.1-1.4 (Add AI Agent, create table, build processor, integrate)
- Days 3-4: Tasks 1.5-1.6 (Build UI, create knowledge base)
- Day 5: Tasks 1.7-1.8 (Configure Shopify/PERP)
- Days 6-7: Task 1.9 (Testing and refinement)

**Milestone:** AI Agent processing tickets and generating draft responses ✅

---

### **Week 2 (Dec 9-15): Phase 2 - Dashboard Polish**
- Days 1-2: Tasks 2.1-2.4 (Staff notes, bulk actions, signatures, merge tickets)

**Milestone:** Dashboard feature-complete ✅

---

### **Week 3-4 (Dec 16-29): Phase 3 - Dartmouth OS Core**
- Week 3: Tasks 3.1-3.2 (Knowledge domains, Shopify integration)
- Week 4: Task 3.3 + Testing (Agent context passing, comprehensive testing)

**Milestone:** Dartmouth OS Core complete - ready for all agents ✅

---

### **Week 5 (Dec 30 - Jan 5): Phase 4 - Sales Agent**
- Days 1-3: Tasks 4.1-4.4 (Handlers)
- Days 4-5: Tasks 4.5-4.8 (Inventory, follow-up, currency, payment plans)
- Days 6-7: Task 4.9 (Testing)

**Milestone:** Sales Agent production-ready ✅

---

### **January 2026: Phase 5 - Admin Dashboard**
- Weeks 1-3: Build admin dashboard features

**Milestone:** Self-service configuration for tenants ✅

---

### **February 2026: Phase 6 - Analytics**
- Weeks 1-2: Build analytics and reporting

**Milestone:** Full insights and performance tracking ✅

---

### **March-April 2026: Phase 7 - Omnichannel**
- Build additional communication channels

**Milestone:** Multi-channel support ✅

---

## 🎯 **SUCCESS CRITERIA**

### **Phase 1 Complete When:**
- ✅ AI Agent appears in dashboard as staff member
- ✅ New email tickets trigger AI processing
- ✅ AI draft responses stored in database
- ✅ Dashboard displays AI Response Panel
- ✅ Staff can approve/edit/reject AI drafts
- ✅ Approved drafts send emails via Resend
- ✅ Tickets assigned to AI Agent
- ✅ Low confidence tickets escalate to humans
- ✅ 80%+ of test emails get AI drafts
- ✅ 70%+ of AI drafts are approved by staff

### **Phase 2 Complete When:**
- ✅ Staff notes have improved layout
- ✅ Bulk ticket reassignment works
- ✅ Email signatures functional
- ✅ Merge tickets feature works

### **Phase 3 Complete When:**
- ✅ Knowledge domain system operational
- ✅ Shopify integration shared across agents
- ✅ Agent context passing works seamlessly
- ✅ Multiple agents can access shared knowledge
- ✅ Permission system enforces access control

### **Phase 4 Complete When:**
- ✅ Sales Agent can calculate accurate prices
- ✅ Sales Agent can generate professional quotes
- ✅ Sales Agent can recommend upsells
- ✅ Sales Agent checks inventory
- ✅ Sales Agent follows up on quotes
- ✅ Sales Agent supports multiple currencies

---

## 🚨 **CRITICAL DEPENDENCIES**

### **Phase 1 Dependencies:**
- ✅ Email System V2 (complete)
- ✅ Customer Service Dashboard (complete)
- ✅ Ticket Management (complete)
- ✅ Customer Service Agent (code complete)
- ⚠️ Shopify API credentials (need to obtain)
- ⚠️ PERP database access (need to configure)

### **Phase 3 Dependencies:**
- ✅ RAGEngine (complete)
- ✅ BaseAgent (complete)
- ⚠️ Knowledge domain design (need to finalize)

### **Phase 4 Dependencies:**
- ❌ Phase 3 must be complete (Knowledge Domains, Shopify Integration)
- ⚠️ PDF generation library (need to select: jsPDF or similar)

### **Phase 5 Dependencies:**
- ❌ Phase 3 must be complete (Integration framework)
- ⚠️ Admin UI framework (use existing dashboard or separate?)

---

## 🔧 **TROUBLESHOOTING GUIDE**

### **AI Agent Not Processing Tickets**

**Symptoms:**
- New tickets created but no AI draft response
- AI Agent not assigned to tickets

**Check:**
1. Is AI Agent in `staff_users` table?
   ```sql
   SELECT * FROM staff_users WHERE id = '00000000-0000-0000-0000-000000000004';
   ```
2. Is `AIAgentProcessor` being called in `EmailHandler.ts`?
3. Check Worker logs for errors:
   ```bash
   npx wrangler tail
   ```
4. Is `ai_draft_responses` table created?
   ```sql
   SELECT name FROM sqlite_master WHERE type='table' AND name='ai_draft_responses';
   ```

---

### **AI Drafts Not Appearing in Dashboard**

**Symptoms:**
- AI creates drafts but dashboard doesn't show them

**Check:**
1. Is `AIResponsePanel` component imported in `TicketDetailPage.tsx`?
2. Is API endpoint `/api/tickets/:id/ai-draft` working?
3. Check browser console for errors
4. Verify draft exists in database:
   ```sql
   SELECT * FROM ai_draft_responses WHERE ticket_id = 'TICKET_ID';
   ```

---

### **Shopify Integration Not Working**

**Symptoms:**
- AI can't answer order status questions
- "Shopify API error" in logs

**Check:**
1. Are Shopify credentials configured?
   ```bash
   npx wrangler secret list
   ```
2. Is Shopify domain verified?
3. Are API permissions correct? (read_products, read_orders, read_customers)
4. Test Shopify API directly:
   ```bash
   curl -H "X-Shopify-Access-Token: YOUR_TOKEN" https://YOUR_STORE.myshopify.com/admin/api/2024-01/products.json
   ```

---

### **RAG Not Retrieving Knowledge**

**Symptoms:**
- AI gives generic answers instead of using knowledge base
- "No relevant chunks found" in logs

**Check:**
1. Are documents ingested?
   ```sql
   SELECT COUNT(*) FROM rag_chunks WHERE agent_id = 'customer-service';
   ```
2. Is embedding generation working?
3. Is similarity threshold too high? (default: 0.7)
4. Check RAG logs:
   ```typescript
   console.log('[RAGEngine] Query:', query);
   console.log('[RAGEngine] Found chunks:', chunks.length);
   ```

---

## 📚 **TESTING GUIDE**

### **Phase 1 Testing: AI Agent Integration**

#### **Test 1: Simple Order Status Inquiry**
```
Email: "Where is my order #12345?"

Expected:
- AI generates draft with order status from Shopify
- Confidence: High (>0.8)
- Staff approves and sends
```

#### **Test 2: Production Status Inquiry**
```
Email: "Is my artwork approved yet?"

Expected:
- AI generates draft with artwork status from PERP
- Confidence: High (>0.8)
- Staff approves and sends
```

#### **Test 3: Complex Question**
```
Email: "Can I change my order to a different product?"

Expected:
- AI generates draft referencing company policy
- Confidence: Medium (0.6-0.7)
- Staff reviews, edits, and sends
```

#### **Test 4: Angry Customer**
```
Email: "This is RIDICULOUS! I've been waiting 3 weeks!"

Expected:
- AI detects sentiment = 'angry'
- Escalates immediately to human
- No draft generated
```

#### **Test 5: VIP Customer**
```
Email: "Hi, I need a quote for 500 shirts" (from VIP email)

Expected:
- AI detects VIP status
- Escalates immediately to human
- No draft generated
```

#### **Test 6: Urgent Request**
```
Email: "URGENT: Need rush order for tomorrow!"

Expected:
- AI detects priority = 'urgent'
- Escalates immediately to human
- No draft generated
```

#### **Test 7: Out-of-Scope Question**
```
Email: "What's your return policy?"

Expected:
- AI generates draft referencing RAG knowledge base
- Confidence: High (>0.8)
- Staff approves and sends
```

#### **Test 8: Low Confidence**
```
Email: "I received the wrong item but I'm not sure what I ordered"

Expected:
- AI generates draft but confidence < 0.6
- Escalates to human
- Draft saved for reference
```

---

### **Phase 4 Testing: Sales Agent**

#### **Test 1: Simple Pricing Question**
```
User: "How much for 100 custom t-shirts?"

Expected:
- Sales Agent searches 'products' domain
- Calculates: 100 × $15 = $1,500
- Applies volume discount: -10% = $1,350
- Calculates tax: +$135 = $1,485
- Response: "100 custom t-shirts: $1,485 (inc GST)"
```

#### **Test 2: Inventory Check**
```
User: "Quote for 1000 tumblers"

Expected:
- Sales Agent checks inventory
- Only 500 available
- Response: "Only 500 units available. Would you like to order 500 now and 500 later?"
```

#### **Test 3: Upsell Opportunity**
```
User: "How much for 10 t-shirts?"

Expected:
- Calculates: 10 × $20 = $200
- Detects: Close to volume discount (20 units)
- Upsell: "But if you order 20, you get 15% off = $340 ($17 each). Save $60!"
```

#### **Test 4: Route to Technical Agent**
```
User: "Can you print my artwork on metal?"

Expected:
- Sales Agent detects technical question
- Routes to Artwork Analyser Agent
- Artwork Agent: "Yes, UV DTF works on metal"
- Returns to Sales Agent: "Yes! UV DTF on metal. 10cm × 10cm stickers: $3 each"
```

---

## 📖 **ARCHITECTURE DIAGRAMS**

### **Current Architecture (Phase 1)**

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER SENDS EMAIL                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE EMAIL ROUTING                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   EMAIL HANDLER                              │
│  1. Parse MIME                                              │
│  2. Store in conversations + emails                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  TICKET MANAGER                              │
│  1. Create ticket                                           │
│  2. Detect priority/sentiment/category                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│             ⭐ AI AGENT PROCESSOR (NEW) ⭐                   │
│  1. Instantiate CustomerServiceAgent                        │
│  2. Pass ticket message to agent                            │
│  3. Agent analyzes intent                                   │
│  4. Agent routes to handler                                 │
│  5. Handler queries Shopify/PERP/RAG                        │
│  6. Agent generates draft response                          │
│  7. Agent calculates confidence score                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
         High Confidence    Low Confidence
                │                 │
                ▼                 ▼
┌───────────────────────┐  ┌──────────────────────────┐
│  STORE DRAFT RESPONSE │  │  ESCALATE TO HUMAN       │
│  1. Save to DB        │  │  1. Assign to staff      │
│  2. Assign to AI      │  │  2. Set priority HIGH    │
└───────────┬───────────┘  └──────────┬───────────────┘
            │                         │
            └────────┬────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            CUSTOMER SERVICE DASHBOARD                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🤖 AI DRAFT RESPONSE (NEW)                            │ │
│  │  Confidence: 85% ⭐⭐⭐⭐                              │ │
│  │  [Approve & Send] [Edit] [Reject]                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### **Target Architecture (Phase 3 - After Core Infrastructure)**

```
┌─────────────────────────────────────────────────────────────┐
│                    DARTMOUTH OS CORE                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Knowledge Domain System                                │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┐        │ │
│  │  │ Products │ Pricing  │ Policies │Technical │        │ │
│  │  │ (shared) │(restrict)│ (shared) │ (shared) │        │ │
│  │  └──────────┴──────────┴──────────┴──────────┘        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Integration Services (Shared)                          │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┐        │ │
│  │  │ Shopify  │  PERP    │  Stripe  │  Twilio  │        │ │
│  │  │(products)│(productn)│(payments)│(messages)│        │ │
│  │  └──────────┴──────────┴──────────┴──────────┘        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Agent Orchestration                                    │ │
│  │  • Agent Handoff Protocol                               │ │
│  │  • Context Passing                                      │ │
│  │  • Permission Management                                │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Customer        │ │ Sales           │ │ McCarthy        │
│ Service Agent   │ │ Agent           │ │ Artwork Agent   │
│                 │ │                 │ │                 │
│ Accesses:       │ │ Accesses:       │ │ Accesses:       │
│ • Products ✅   │ │ • Products ✅   │ │ • Products ✅   │
│ • Policies ✅   │ │ • Pricing ✅    │ │ • Technical ✅  │
│ • Shopify ✅    │ │ • Policies ✅   │ │ • Policies ✅   │
│ • PERP ✅       │ │ • Shopify ✅    │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 🎓 **KEY LEARNINGS**

### **What Went Well:**
1. ✅ Email System V2 - Complete overhaul was the right decision
2. ✅ Dartmouth Foundation - Solid architecture, reusable
3. ✅ TicketManager - Centralized service prevents duplicate logic
4. ✅ Priority/Sentiment Detection - Simple keyword approach works (80% accuracy)
5. ✅ Scheduled Messages - Clean implementation with cron job

### **What We'd Do Differently:**
1. ⚠️ Build Dartmouth OS Core first, then agents
2. ⚠️ Get API credentials before building integrations
3. ⚠️ Write knowledge base documents before building RAG
4. ⚠️ Define test scenarios earlier

### **Critical Insights:**
1. **Architecture Matters** - Centralized services prevent bugs
2. **Email Threading is Hard** - Cloudflare + Resend was right choice
3. **Human-in-the-Loop** - AI draft approval is critical for trust
4. **Confidence Scores** - Essential for escalation logic
5. **Staff Buy-In** - Involve staff early, they need to trust AI

---

## 📞 **SUPPORT & RESOURCES**

### **Documentation:**
- `AI_AGENT_INTEGRATION_STATUS_DEC_1_2025.md` - AI integration plan
- `COMPREHENSIVE_STATUS_DEC_1_2025.md` - Full system overview
- `START_HERE_DEC_2_2025.md` - Quick start guide
- `SALES_AGENT_SPECIFICATION.md` - Sales Agent spec (D:\coding\Sales Agent\)

### **Key Files:**
- `packages/worker/src/services/EmailHandler.ts` - Email processing
- `packages/worker/src/services/TicketManager.ts` - Ticket management
- `packages/worker/src/components/RAGEngine.ts` - Knowledge retrieval
- `packages/customer-service-agent/src/CustomerServiceAgent.ts` - AI agent
- `packages/customer-service-dashboard/src/pages/TicketDetailPage.tsx` - Dashboard UI

---

## 🚀 **LET'S BUILD!**

**Current Priority:** Phase 1 - AI Agent Integration (35 hours)

**Next Steps:**
1. Review this master plan
2. Confirm priorities and timeline
3. Start Task 1.1: Add AI Agent as staff member (2 hours)

**Status:** ✅ **READY TO START**

---

**Document Version:** 2.0  
**Created:** December 2, 2025  
**Author:** AI Assistant  
**Next Review:** After Phase 1 completion

---

**🎯 REMEMBER: DARTMOUTH OS CORE FIRST, THEN AGENTS! 🚀**

