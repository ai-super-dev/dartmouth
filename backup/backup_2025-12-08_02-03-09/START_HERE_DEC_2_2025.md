# 🚀 START HERE - December 2, 2025

**Status:** Ready to integrate AI Agent  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 35 hours (4-5 days)

---

## 📖 READ THESE FIRST

**Before starting, read these 2 documents:**

1. **`COMPREHENSIVE_STATUS_DEC_1_2025.md`** - Complete overview of what's built
2. **`AI_AGENT_INTEGRATION_STATUS_DEC_1_2025.md`** - Detailed AI integration plan

---

## 🎯 THE SITUATION

### What We Have

- ✅ **Email System V2** - Fully operational, creating tickets from emails
- ✅ **Customer Service Dashboard** - Staff can view and reply to tickets manually
- ✅ **Customer Service AI Agent** - Built, tested (17/17 tests passing), but NOT integrated
- ✅ **Dartmouth Foundation** - Complete AI platform with RAG, memory, quality control

### The Problem

**The AI Agent is not processing tickets.**

Current flow:
```
Email arrives → Ticket created → Staff reply manually
```

Target flow:
```
Email arrives → Ticket created → AI generates draft → Staff approve/edit → Send
```

### The Impact

**Without AI integration:**
- Staff handle 100% of tickets manually
- No time savings
- No 24/7 coverage
- System is just a fancy ticketing system

**With AI integration:**
- 70-80% of tickets get AI draft responses
- <1 minute initial response time
- 24/7 availability
- Staff only handle complex/escalated tickets

---

## 🗺️ THE PLAN

### Phase 1: Core AI Integration (23 hours)

**Goal:** Get AI Agent processing tickets and generating draft responses.

| Task | Time | Priority | Status |
|------|------|----------|--------|
| 1. Add AI Agent as staff member | 2h | 🔴 Critical | ⏳ Ready |
| 2. Create AI draft responses table | 1h | 🔴 Critical | ⏳ Ready |
| 3. Build AIAgentProcessor service | 4h | 🔴 Critical | ⏳ Ready |
| 4. Integrate AI into email handler | 2h | 🔴 Critical | ⏳ Ready |
| 5. Build AI Response Panel UI | 6h | 🔴 Critical | ⏳ Ready |
| 6. Test and refine | 8h | 🔴 Critical | ⏳ Ready |

**Deliverable:** AI generates draft responses for all new tickets, staff can approve/edit/reject in dashboard.

---

### Phase 2: Data Integrations (12 hours)

**Goal:** Enable AI to answer real questions with real data.

| Task | Time | Priority | Status |
|------|------|----------|--------|
| 7. Create knowledge base documents | 4h | 🟡 High | ⏳ Ready |
| 8. Configure Shopify integration | 3h | 🟡 High | ⚠️ Need credentials |
| 9. Configure PERP integration | 3h | 🟡 High | ⚠️ Need credentials |
| 10. Test AI with real data | 2h | 🟡 High | ⏳ Ready |

**Deliverable:** AI can answer "Where's my order?" and "What's my production status?" with real data.

---

### Phase 3: Notifications & Polish (7 hours)

**Goal:** Improve staff experience and escalation workflow.

| Task | Time | Priority | Status |
|------|------|----------|--------|
| 11. Implement escalation notifications | 2h | 🟢 Medium | ⏳ Ready |
| 12. Add dashboard notification badge | 1h | 🟢 Medium | ⏳ Ready |
| 13. Refine UI/UX based on feedback | 4h | 🟢 Medium | ⏳ Ready |

**Deliverable:** Staff are notified when AI escalates tickets, improved dashboard UX.

---

## 📋 TASK 1: ADD AI AGENT AS STAFF MEMBER (2 hours)

### What & Why

Make the AI Agent visible in the system as an assignable staff member so:
- Tickets can be assigned to AI
- Staff can filter by "AI Agent" in sidebar
- Dashboard shows AI's workload

### Steps

1. **Create migration** (10 min)
   ```bash
   cd D:\coding\DARTMOUTH_OS_PROJECT\packages\worker
   ```
   
   Create file: `migrations/0014_add_ai_agent_staff.sql`
   ```sql
   INSERT INTO staff_users (
     id,
     email,
     password_hash,
     first_name,
     last_name,
     role,
     is_active,
     created_at,
     updated_at
   ) VALUES (
     '00000000-0000-0000-0000-000000000004',
     'ai-agent@dtf.com.au',
     'N/A',
     'AI',
     'Agent',
     'agent',
     1,
     datetime('now'),
     datetime('now')
   );
   ```

2. **Run migration** (5 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --file=migrations/0014_add_ai_agent_staff.sql
   ```

3. **Update TicketsPage.tsx** (15 min)
   
   File: `packages/customer-service-dashboard/src/pages/TicketsPage.tsx`
   
   Find `staffNames` object, add:
   ```typescript
   '00000000-0000-0000-0000-000000000004': 'AI Agent',
   ```

4. **Update ReassignModal.tsx** (15 min)
   
   File: `packages/customer-service-dashboard/src/components/ReassignModal.tsx`
   
   Find `staffMembersBase` array, add:
   ```typescript
   { 
     id: '00000000-0000-0000-0000-000000000004', 
     name: 'AI Agent', 
     role: 'AI', 
     online: true 
   },
   ```

5. **Update EscalateModal.tsx** (15 min)
   
   File: `packages/customer-service-dashboard/src/components/EscalateModal.tsx`
   
   Find `staffMembers` array, add:
   ```typescript
   { 
     id: '00000000-0000-0000-0000-000000000004', 
     name: 'AI Agent', 
     role: 'AI' 
   },
   ```

6. **Update Sidebar.tsx** (30 min)
   
   File: `packages/customer-service-dashboard/src/components/layout/Sidebar.tsx`
   
   Add new link under "Assigned" section:
   ```tsx
   <Link
     to="/tickets?assigned=00000000-0000-0000-0000-000000000004"
     className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg ${
       location.search.includes('assigned=00000000-0000-0000-0000-000000000004')
         ? 'bg-indigo-50 text-indigo-700'
         : 'text-gray-700 hover:bg-gray-50'
     }`}
   >
     <span>🤖 AI Agent</span>
     {ticketCounts.ai > 0 && (
       <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
         location.search.includes('assigned=00000000-0000-0000-0000-000000000004')
           ? 'bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
           : 'bg-gray-200 text-gray-800 ring-1 ring-inset ring-gray-400 font-semibold'
       }`}>
         {ticketCounts.ai}
       </span>
     )}
   </Link>
   ```

7. **Update DashboardLayout.tsx** (15 min)
   
   File: `packages/customer-service-dashboard/src/components/layout/DashboardLayout.tsx`
   
   Find `ticketCounts` object, add:
   ```typescript
   ai: tickets.filter((t: any) => 
     t.assigned_to === '00000000-0000-0000-0000-000000000004' &&
     (t.status === 'open' || t.status === 'in-progress')
   ).length,
   ```

8. **Test** (15 min)
   - Restart dashboard: `npm run dev`
   - Open ticket, click "Reassign"
   - Verify "AI Agent" appears in list
   - Assign ticket to AI Agent
   - Click "🤖 AI Agent" in sidebar
   - Verify ticket appears

**Deliverable:** ✅ AI Agent is visible in dashboard, can be assigned tickets.

---

## 📋 TASK 2: CREATE AI DRAFT RESPONSES TABLE (1 hour)

### What & Why

Create database table to store AI-generated draft responses so:
- AI drafts are persisted
- Staff can review and approve later
- We can track AI performance metrics

### Steps

1. **Create migration** (20 min)
   
   Create file: `migrations/0015_add_ai_draft_responses.sql`
   ```sql
   CREATE TABLE IF NOT EXISTS ai_draft_responses (
     id TEXT PRIMARY KEY,
     ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id),
     draft_content TEXT NOT NULL,
     confidence_score REAL NOT NULL,
     intent TEXT,
     handler_used TEXT,
     reasoning TEXT,
     suggested_actions TEXT,
     shopify_data TEXT,
     perp_data TEXT,
     rag_chunks_used TEXT,
     created_at TEXT NOT NULL,
     approved_by TEXT REFERENCES staff_users(id),
     approved_at TEXT,
     edited_content TEXT,
     status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'edited')) DEFAULT 'pending',
     FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
   );

   CREATE INDEX IF NOT EXISTS idx_ai_drafts_ticket ON ai_draft_responses(ticket_id);
   CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_draft_responses(status);
   ```

2. **Run migration** (5 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --file=migrations/0015_add_ai_draft_responses.sql
   ```

3. **Verify table created** (5 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_draft_responses';"
   ```

4. **Test insert** (10 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --command "INSERT INTO ai_draft_responses (id, ticket_id, draft_content, confidence_score, created_at) VALUES ('test-1', (SELECT ticket_id FROM tickets LIMIT 1), 'Test draft response', 0.85, datetime('now'));"
   ```

5. **Test query** (10 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --command "SELECT * FROM ai_draft_responses WHERE id = 'test-1';"
   ```

6. **Clean up test data** (5 min)
   ```bash
   npx wrangler d1 execute dartmouth-os-db --remote --command "DELETE FROM ai_draft_responses WHERE id = 'test-1';"
   ```

**Deliverable:** ✅ Database can store AI draft responses.

---

## 📋 TASK 3: BUILD AIAGENTPROCESSOR SERVICE (4 hours)

### What & Why

Create service that orchestrates AI agent invocation, confidence checking, and escalation.

### Steps

1. **Create service file** (30 min)
   
   Create file: `packages/worker/src/services/AIAgentProcessor.ts`
   
   ```typescript
   import { CustomerServiceAgent } from '../../../customer-service-agent/src/CustomerServiceAgent';
   import { getBaseAgentConfig } from '../utils/agentConfig';
   import type { Env } from '../types/shared';
   import type { NormalizedMessage } from './OmnichannelRouter';

   export class AIAgentProcessor {
     constructor(private env: Env) {}

     async processTicket(ticketId: string, message: NormalizedMessage): Promise<void> {
       // Implementation coming next
     }
   }
   ```

2. **Implement processTicket method** (1.5 hours)
   
   See `AI_AGENT_INTEGRATION_STATUS_DEC_1_2025.md` Section 6, Phase 3 for full implementation.

3. **Add helper methods** (1 hour)
   - `shouldEscalate(ticket, confidence)`
   - `storeDraftResponse(ticketId, response)`
   - `assignToAI(ticketId)`
   - `escalateToHuman(ticketId, reason)`

4. **Add error handling** (30 min)
   - Wrap in try/catch
   - Log errors
   - Don't break email flow if AI fails

5. **Write unit tests** (30 min)
   
   Create file: `packages/worker/src/__tests__/AIAgentProcessor.test.ts`

**Deliverable:** ✅ Service can invoke AI and store draft responses.

---

## 📋 NEXT STEPS

### After Task 3

Continue with:
- **Task 4:** Integrate AI into email handler (2 hours)
- **Task 5:** Build AI Response Panel UI (6 hours)
- **Task 6:** Test and refine (8 hours)

See `AI_AGENT_INTEGRATION_STATUS_DEC_1_2025.md` for detailed instructions on each task.

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:

- ✅ AI Agent appears in dashboard
- ✅ New email tickets trigger AI processing
- ✅ AI draft responses stored in database
- ✅ Dashboard displays AI Response Panel
- ✅ Staff can approve/edit/reject AI drafts
- ✅ Approved drafts send emails via Resend
- ✅ Tickets assigned to AI Agent
- ✅ Low confidence tickets escalate to humans
- ✅ 80%+ of test emails get AI drafts
- ✅ 70%+ of AI drafts are approved by staff

---

## 📞 QUESTIONS?

**If stuck, refer to:**
1. `AI_AGENT_INTEGRATION_STATUS_DEC_1_2025.md` - Complete implementation plan
2. `COMPREHENSIVE_STATUS_DEC_1_2025.md` - Full system overview
3. `CUSTOMER_SERVICE_AGENT_COMPLETE_2025-11-28.md` - Agent architecture

**Key files to understand:**
- `packages/worker/src/services/EmailHandler.ts` - Where to insert AI
- `packages/customer-service-agent/src/CustomerServiceAgent.ts` - The AI agent
- `packages/worker/src/services/TicketManager.ts` - Ticket management
- `packages/customer-service-dashboard/src/pages/TicketDetailPage.tsx` - Dashboard UI

---

## 🚀 LET'S GO!

**Start with Task 1 (2 hours) and work through the plan.**

The foundation is solid. We just need to connect the pieces. 💪

---

**Document Version:** 1.0  
**Created:** December 2, 2025  
**Author:** AI Assistant

