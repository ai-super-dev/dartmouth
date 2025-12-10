# 🎯 FINAL TODO LIST - December 9, 2025

**Last Updated:** December 9, 2025, 11:59 PM AEST  
**Status:** Complete and Accurate  
**Source:** Full review + user clarifications

---

## ✅ **RECENTLY COMPLETED (Dec 9, 2025):**

1. ✅ Email Signature System
2. ✅ Font Consistency (Arial everywhere)
3. ✅ Auto-Scroll to Latest Message
4. ✅ Signature Spacing
5. ✅ Left Menu Navigation
6. ✅ Attachments Fix
7. ✅ Mentions Quick Filter Pills (already done)
8. ✅ Group Chat Time Limits (already done)
9. ✅ @Memo Feature (already done)
10. ✅ Typing Indicators (already exists in chat widget)
11. ✅ Post-Chat Survey (done - needs testing)
12. ✅ Manual Tagging System (complete)

---

## 🔴 **CRITICAL - MUST FIX (2 items)**

### **1. Password Security** 🔐
**Priority:** 🔴 **HIGHEST - BLOCKS PRODUCTION**  
**File:** `packages/worker/src/controllers/auth.ts` (lines 12-16)  
**Issue:** Plain text password comparison  
**Fix:** Implement bcrypt/argon2 with Web Crypto API  
**Impact:** All staff passwords vulnerable  
**Effort:** 4-6 hours  
**Status:** ⚠️ NOT STARTED

---

### **2. Verify Auto-Assignment is Working**
**Priority:** 🔴 HIGH  
**Issue:** Need to verify email auto-assignment is functioning  
**Check:**
- Is auto-assignment working?
- Configuration settings accessible?
- Max tickets per staff enforced?
- Availability-based assignment working?
- Round-robin or workload-based?
**Effort:** 1 hour (testing/fixing)  
**Status:** ⏳ NEEDS VERIFICATION

---

## 🟡 **HIGH PRIORITY - Quick Wins (7 items - ~5 hours)**

### **3. Staff Can Create Tickets Manually**
**Priority:** 🟡 HIGH  
**Effort:** 2-3 hours

**Features:**
- "Create Ticket" button in dashboard
- Form: Customer name, email, phone, subject, message
- Select channel (email, phone, chat)
- Select priority
- Auto-assign or manual assign
- Creates ticket in system

**Use Cases:**
- Phone call → Create ticket manually
- Walk-in customer → Create ticket
- Proactive outreach → Create ticket

---

### **4. Live Chat AI Label**
**Issue:** Shows "AI Handling"  
**Fix:** Change to "McCarthy AI"  
**Effort:** 30 minutes

### **5. Live Chat Callback Text**
**Issue:** `__SHOW_CALLBACK_FORM__` displayed  
**Fix:** Replace with "CALL BACK REQUEST"  
**Effort:** 30 minutes

### **6. Live Chat Default View**
**Issue:** Doesn't default to newest ticket  
**Fix:** Auto-select newest + show messages  
**Effort:** 1 hour

### **7. Platform Dropdown Icons**
**Issue:** Inconsistent icons  
**Fix:** Standardize all platform icons  
**Effort:** 1 hour

### **8. Phone Icon Fix**
**Issue:** Green phone icon (should be red)  
**Fix:** Use solid red phone icon for callbacks  
**Effort:** 30 minutes

### **9. Email Icon Consistency**
**Issue:** Different envelope icons  
**Fix:** Use same `Mail` icon everywhere  
**Effort:** 30 minutes

### **10. Live Chat Icon Consistency**
**Issue:** Different chat icons  
**Fix:** Use same `MessageSquare` icon everywhere  
**Effort:** 30 minutes

---

## 🎯 **MAJOR FEATURES (5 features - ~93 hours)**

### **11. Task Management System + Task Manager Agent**
**Priority:** 🔴 **HIGHEST BUSINESS VALUE**  
**Effort:** 25-30 hours

#### **Overview:**
Complete task management system with Task Manager Agent (AI quarterback) that coordinates work between staff and McCarthy AI.

#### **Task Format:**
- Database/UI: `TSK-123` (full format)
- Mentions: `*123` (in Group Chat, quick reference)
- Sub-tasks: `TSK-123-1` / `*123-1`
- Icon: `Clipboard` (Lucide React)

#### **Phase 1: Core Task System (10-12 hours)**

**1.1 Task Tickets**
- New ticket type: `task`
- Parent/child relationships (`TSK-123` → `TSK-123-1`)
- Link to original customer ticket
- Task numbering system (auto-increment)
- Task queue (shows in All Tickets + My Tickets)
- Task detail view (same as ticket detail)
- Opens in Task Manager (not regular ticket view)

**1.2 Task Manager Agent**
- AI agent (separate from McCarthy AI)
- Creates tasks from `@task` mentions in Group Chat
- Assigns to staff or McCarthy AI
- Tracks deadlines and SLA
- Sends reminders
- Updates task status
- Notifies stakeholders
- Coordinates sub-tasks
- Reports completion

**1.3 Task Group Chat Channel**
- Dedicated `#tasks` channel in Group Chat
- Task Manager posts updates here
- Staff collaborate on tasks
- Mentions for notifications
- Task status updates

**1.4 Task UI Components**
- Task list in All Tickets queue
- Task detail page (reuse ticket detail components)
- Same buttons: Reassign, Escalate, Snooze, Delete, Merge
- Same statuses: Open, In Progress, Waiting, Completed
- Same priority levels
- Task-specific: Deadline field, Sub-tasks list, Parent link

---

#### **Phase 2: McCarthy AI Integration (8-10 hours)**

**2.1 McCarthy as Task Executor**
- Can be assigned tasks
- Executes commands:
  - Send messages to customers
  - Fetch Shopify data
  - Update order status
  - Draft emails
  - Schedule callbacks
- Can create sub-tasks if needs help from staff
- Reports back when complete

**2.2 AI Draft Response for Tasks** ⚠️ **CRITICAL: Human in Loop**
- Similar to ticket AI Draft panel
- McCarthy completes task → Creates "AI Draft Response"
- Shows proposed customer message
- **Staff MUST approve before customer sees it**
- Approve/Edit/Reject buttons
- Only sends to customer after approval
- Training McCarthy with feedback

**2.3 Command Execution**
- Parse `@task @mccarthy [instruction]` mentions
- Extract action and parameters
- Execute autonomously
- Fetch data from Shopify/systems
- Generate responses
- Wait for approval

---

#### **Phase 3: Deadline & Notifications (4-5 hours)**

**3.1 Deadline Management**
- Set deadlines on task creation
- Track SLA for analytics/reporting
- Automatic reminders:
  - 1 day before deadline
  - 1 hour before deadline
  - When deadline passes
  - Daily for overdue tasks
- Update original ticket with task status

**3.2 Notification System**
- Task Manager sends Group Chat messages in `#tasks` channel
- Mentions staff/McCarthy with `@name`
- Examples:
  - `@gaille sub-task *123-1 completed by Sam, proceed with *123`
  - `@mccarthy task *123 deadline approaching Dec 10, 5pm`
  - `@john task *123 overdue by 2 hours`
  - `@gaille *456 completed by McCarthy AI, please review`

---

#### **Phase 4: Task Collaboration (3-4 hours)**

**4.1 Sub-Tasks**
- Create sub-tasks from parent task
- Assign to different staff/McCarthy
- Parent task waits for sub-tasks
- Auto-notify parent owner when sub-task done
- Hierarchy: `TSK-123` → `TSK-123-1`, `TSK-123-2`

**4.2 Task Response Area**
- Internal chat between staff about task
- **NOT sent to customer** (internal only)
- Can create sub-tasks from here via `@task @staff`
- Mentions work for collaboration
- Attachments support
- Activity timeline

**4.3 Task Workflow**
```
Customer → Ticket (TKT-254) → McCarthy AI Draft
                                    ↓
                        Staff Reviews → Needs Action
                                    ↓
                Staff: "@task @mccarthy update customer with tracking"
                                    ↓
                Task Manager Creates TSK-789 → Assigns to McCarthy
                                    ↓
                McCarthy: "Need order number" → Creates TSK-789-1
                                    ↓
                Task Manager Assigns TSK-789-1 to John
                                    ↓
                John Provides Info → TSK-789-1 Complete
                                    ↓
                Task Manager Notifies McCarthy → Complete TSK-789
                                    ↓
                McCarthy Fetches Data → Creates AI Draft Response
                                    ↓
                Staff Reviews AI Draft → Approves
                                    ↓
                Message Sent to Customer → TSK-789 Complete
```

---

### **12. Shopify Enhancements**
**Priority:** 🟢 MEDIUM  
**Source:** `D:\coding\SHOPIFY DATA\Shopify data to display.txt`  
**Effort:** 8-10 hours

**Requirements:**
- VIP status (Yes/No)
- Total Spend + Purchase Count + Refund Count
- Clickable order details (add to message)
- Arrow navigation (left/right) for multiple orders ✅ (already done)
- Clickable product details (add to message)
- **Pretty Preview Links** (hyperlinked, not raw URLs)
- **Pretty Edit Links** (hyperlinked, not raw URLs)
- Clickable shipping details (add to message)
- Shipping tracking link
- Customer details section
- Billing address

**Current Status:** Basic Shopify integration exists, needs enhancement

---

### **13. Canned Responses / Templates / Macros**
**Priority:** 🟢 MEDIUM  
**Source:** `D:\coding\Tagging & Canned Responses\macros-templates-8-12-25.csv`  
**Effort:** 8-10 hours

**Requirements:**
- Import **308 canned responses** from CSV
- Template variables: `{{ticket.customer.firstname}}`, etc.
- Quick insert into reply area
- Search/filter templates
- Categories: Order Issues, Application Help, Transfer Issues, etc.
- Admin UI to manage templates
- Edit/Create/Delete templates
- Preview before insert

**Templates Include:**
- Order Not Received
- Bulk Credits
- Application Instructions
- Transfer Issues (Wrinkling, Condensation, etc.)
- Shipping/Tracking
- Returns/Refunds
- And 300+ more

---

### **14. AI Auto-Tagging System**
**Priority:** 🟢 MEDIUM  
**Source:** `TAGGING_SYSTEM_ARCHITECTURE.md` + `ADVANCED_TAGGING_RESEARCH.md`  
**Effort:** 18-20 hours

**Current Status:**
- ✅ Manual tagging complete (`#keyword` syntax)
- ✅ Tags page, search, display
- ⏳ AI automation pending

**Phase 1: McCarthy AI Integration (8-10 hours)**
- AI auto-tagging on ticket creation
- Shopify RFM calculation (Recency, Frequency, Monetary)
- Customer segmentation:
  - `#Champions`, `#Loyal`, `#At-Risk`, `#Churned`
  - `#VIP-Top-1%`, `#High-Value`, `#Cannot-Lose`
- Sentiment analysis: `#Happy`, `#Frustrated`, `#Angry`
- Intent detection: `#Purchase-Intent`, `#Refund-Request`, `#Complaint`
- Behavioral tags: `#Price-Shopper`, `#Early-Adopter`
- Auto-populate `ai_suggested_tags` field

**Phase 2: Tag Review UI (2-3 hours)**
- Show AI suggested tags on ticket detail
- Approve/Edit/Reject buttons
- Save to `tags` field when approved
- Track `tags_reviewed_by` and `tags_reviewed_at`

**Phase 3: Analytics Dashboard (6-8 hours - Future)**
- Tag usage trends
- Customer segment breakdown
- Revenue by segment
- Churn prediction alerts
- Tag-based reporting

**Business Impact (Research-Validated):**
- +15-25% annual revenue growth
- +20-30% customer retention
- +40-50% marketing ROI
- -60% time categorizing tickets
- $450K-$1M annual impact (mid-sized eCommerce)

---

### **15. FAM Agent + Artwork Analyzer - RAG Vectorization**
**Priority:** 🟢 LOW  
**Effort:** 16-20 hours (8-10 hours each)

**Requirements:**
- Implement RAG like McCarthy AI
- Vector embeddings for FAM knowledge base
- Vector embeddings for Artwork Analyzer knowledge
- Semantic search
- Training data ingestion
- Cloudflare Vectorize integration

**Current Status:** McCarthy AI has RAG (53 vectors), FAM and Artwork Analyzer do not

---

## 📊 **SUMMARY BY PRIORITY:**

| Priority | Items | Estimated Time |
|----------|-------|----------------|
| 🔴 **CRITICAL** | 2 | ~6 hours |
| 🟡 **HIGH (Quick Wins)** | 8 | ~8 hours |
| 🎯 **MAJOR FEATURES** | 5 | ~87 hours |
| **TOTAL** | **15 items** | **~101 hours** |

---

## 🎯 **RECOMMENDED IMPLEMENTATION ORDER:**

### **Week 1: Critical + Quick Wins**
1. 🔐 Password Security (5 hours) - **START HERE**
2. Verify Auto-Assignment (1 hour)
3. Staff Create Tickets (3 hours)
4. Quick UX Fixes (4 hours)

**Total: ~13 hours**

---

### **Week 2-3: Task Management System**
5. Task Management System (25-30 hours)
   - Core system (10-12 hours)
   - McCarthy integration (8-10 hours)
   - Deadlines & notifications (4-5 hours)
   - Collaboration (3-4 hours)

**Total: ~30 hours**

---

### **Week 4: Shopify + Canned Responses**
6. Shopify Enhancements (10 hours)
7. Canned Responses (10 hours)

**Total: ~20 hours**

---

### **Week 5-6: AI Features**
8. AI Auto-Tagging (20 hours)
9. FAM + Artwork RAG (20 hours)

**Total: ~40 hours**

---

## 📂 **REFERENCE DOCUMENTS:**

- `TODO_LIST.md` - Original TODO (Dec 7)
- `COMPREHENSIVE_TODO_DEC_9_2025.md` - Today's review
- `TAGGING_SYSTEM_STATUS_DEC_9_2025.md` - Tagging status
- `D:\coding\SHOPIFY DATA\Shopify data to display.txt` - Shopify requirements
- `D:\coding\Tagging & Canned Responses\macros-templates-8-12-25.csv` - 308 templates
- `D:\coding\TASK MANAGER\TASK MANAGER SYSTEM and AGENT.txt` - Task Manager spec
- `TAGGING_SYSTEM_ARCHITECTURE.md` - Tagging system design
- `TASK_MANAGEMENT_ARCHITECTURE.md` - Task system design

---

## 🚀 **NEXT STEPS:**

**Immediate:** Fix Password Security (CRITICAL - 5 hours)  
**Then:** Quick UX polish + Staff Create Tickets (8 hours)  
**Then:** Task Management System (30 hours) - Biggest feature  
**Then:** Shopify + Canned Responses (20 hours)  
**Then:** AI enhancements (40 hours)

---

**Status:** ✅ **Complete, accurate, and ready to execute**

---

*Last Updated: December 9, 2025, 11:59 PM AEST*

