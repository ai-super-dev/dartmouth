# 📋 COMPREHENSIVE TODO LIST - December 9, 2025

**Last Updated:** December 9, 2025, 11:30 PM AEST  
**Source:** Reviewed ALL docs + external folders  
**Status:** Complete and accurate

---

## 🔴 CRITICAL - MUST FIX (1 item remaining)

### 1. 🔐 Password Security - CRITICAL SECURITY ISSUE
**Priority:** 🔴 **HIGHEST - BLOCKS PRODUCTION**  
**File:** `packages/worker/src/controllers/auth.ts` (lines 12-16)  
**Issue:** Plain text password comparison  
**Fix:** Implement bcrypt/argon2 with Web Crypto API  
**Impact:** All staff passwords vulnerable  
**Effort:** 4-6 hours  
**Status:** ⚠️ NOT STARTED

---

### 2. ✅ Left Menu Navigation Scrolling
**Priority:** 🔴 HIGH  
**Issue:** Clicking links causes page to jump/scroll  
**Impact:** Poor UX, disorienting  
**Effort:** 1 hour  
**Status:** ✅ **COMPLETE**

---

### 3. ✅ Attachments Fix
**Priority:** 🔴 HIGH  
**Issue:** Not working correctly in ticket/livechat/widget  
**Details:**
- Files upload but not always clickable/downloadable
- Images not displaying correctly in some views
- Inconsistent behavior across ticket types
**Impact:** Critical feature not fully functional  
**Effort:** 3-4 hours  
**Status:** ✅ **COMPLETE**

---

## 🟡 HIGH PRIORITY - UX/Polish (9 items)

### 4. Live Chat AI Label
**Issue:** Shows "AI Handling"  
**Fix:** Change to "McCarthy AI"  
**Effort:** 30 minutes

### 5. Live Chat Callback Text
**Issue:** `__SHOW_CALLBACK_FORM__` displayed  
**Fix:** Replace with "CALL BACK REQUEST"  
**Effort:** 30 minutes

### 6. Live Chat Default View
**Issue:** Doesn't default to newest ticket  
**Fix:** Auto-select newest + show messages  
**Effort:** 1 hour

### 7. Platform Dropdown Icons
**Issue:** Inconsistent icons  
**Fix:** Standardize all platform icons  
**Effort:** 1 hour

### 8. Phone Icon Fix
**Issue:** Green phone icon (should be red)  
**Fix:** Use solid red phone icon for callbacks  
**Effort:** 30 minutes

### 9. Email Icon Consistency
**Issue:** Different envelope icons  
**Fix:** Use same envelope everywhere  
**Effort:** 30 minutes

### 10. Live Chat Icon Consistency
**Issue:** Different chat icons  
**Fix:** Use same chat icon everywhere  
**Effort:** 30 minutes

### 11. ✅ Post-Chat Survey
**Status:** ✅ **DONE** (per user - needs testing)  
**Action:** Test functionality

### 12. Typing Indicators
**Status:** ✅ **ALREADY EXISTS** in chat widget  
**File:** `packages/chat-widget/src/widget.ts` (lines 471-504, 1409)  
**Features:** Typing dots animation, "McCarthy is typing..." label  
**Action:** ✅ **NO WORK NEEDED** - Already implemented

---

## 🟢 MEDIUM PRIORITY - Enhancements (4 items)

### 13. ✅ Mentions Quick Filter Pills
**Status:** ✅ **COMPLETE** (verified in code review)

### 14. ✅ Group Chat Edit/Delete Time Limits
**Status:** ✅ **COMPLETE** (verified in code review)

### 15. ✅ @Memo Feature
**Status:** ✅ **COMPLETE** (verified in code review)

### 16. Shopify Data Enhancements
**Source:** `D:\coding\SHOPIFY DATA\Shopify data to display.txt`  
**Priority:** MEDIUM  
**Effort:** 8-10 hours

**Requirements:**
- VIP status (Yes/No)
- Total Spend + Purchase Count + Refund Count
- Clickable order details (add to message)
- Arrow navigation (left/right) for multiple orders
- Clickable product details (add to message)
- Pretty Preview Links (hyperlinked, not raw URLs)
- Pretty Edit Links (hyperlinked, not raw URLs)
- Clickable shipping details (add to message)
- Shipping tracking link
- Customer details section
- Billing address

**Current Status:** Basic Shopify integration exists, needs enhancement

---

## 🎯 MAJOR NEW FEATURES (5 features)

### 17. 📝 Canned Responses / Templates / Macros
**Source:** `D:\coding\Tagging & Canned Responses\macros-templates-8-12-25.csv`  
**Priority:** HIGH  
**Effort:** 8-10 hours

**Requirements:**
- Import 308 canned responses from CSV
- Template variables: `{{ticket.customer.firstname}}`, etc.
- Quick insert into reply area
- Search/filter templates
- Categories: Order Issues, Application Help, Transfer Issues, etc.
- Admin UI to manage templates

**Templates Include:**
- Order Not Received
- Bulk Credits
- Application Instructions
- Transfer Issues (Wrinkling, Condensation, etc.)
- Shipping/Tracking
- Returns/Refunds
- And 300+ more

**Status:** ⏳ NOT STARTED

---

### 18. 🏷️ Advanced Tagging System
**Source:** `D:\coding\Tagging & Canned Responses\` + existing `TAGGING_SYSTEM_ARCHITECTURE.md`  
**Priority:** MEDIUM  
**Effort:** 12-15 hours

**Current Status:** Basic `@tag {keyword}` syntax exists  
**Needs:**
- AI-powered auto-tagging
- RFM customer segmentation
- Revenue optimization tags
- Tag-based analytics
- Sentiment + Intent tagging
- Integration with Shopify data

**Status:** ⏳ PARTIALLY COMPLETE (basic syntax done, AI features pending)

---

### 19. 📋 Task Management System + Task Manager Agent
**Source:** `D:\coding\TASK MANAGER\TASK MANAGER SYSTEM and AGENT.txt`  
**Priority:** HIGH  
**Effort:** 20-30 hours

**Features:**
- McCarthy AI Task Manager Agent
- Task tickets (separate from support tickets)
- Create tasks via `@task @staff` mentions
- Parent/sub-task relationships
- Task deadlines and reminders
- Task chat (response area for collaboration)
- Task queue (shows in All Tickets + My Tickets)
- Task Manager left navigation
- Auto-notifications for deadlines
- Task completion tracking
- Link tasks to tickets

**Example Flow:**
```
@task @gaille
Update website terms by 4pm tomorrow

→ Task Manager creates @task-123
→ Assigns to Gaille
→ Sends mention: "@gaille see @task-123, deadline 4pm 08-12-2025"
→ Shows in Gaille's ticket queue
→ Opens in Task Manager window
→ Can create sub-tasks via @task @sam in response area
```

**Status:** ⏳ NOT STARTED

---

### 20. 🤖 @McCarthy AI Commands
**Priority:** MEDIUM  
**Effort:** 8-10 hours

**Commands:**
- `@mccarthy send message to customer via TKT-123`
- `@mccarthy draft email for review`
- `@mccarthy schedule callback`
- `@mccarthy update customer on order status`
- `@mccarthy fetch Shopify data`

**Features:**
- Command parsing in Group Chat
- Task execution by AI
- Notification when complete
- Error handling

**Status:** ⏳ NOT STARTED

---

### 21. 🤖 FAM Agent + Artwork Analyzer - RAG Vectorization
**Priority:** MEDIUM  
**Effort:** 16-20 hours (8-10 hours each)

**Requirements:**
- Implement RAG like McCarthy AI
- Vector embeddings for FAM knowledge base
- Vector embeddings for Artwork Analyzer knowledge
- Semantic search
- Training data ingestion
- Cloudflare Vectorize integration

**Current Status:** McCarthy AI has RAG (53 vectors), FAM and Artwork Analyzer do not

**Status:** ⏳ NOT STARTED

---

## 📊 SUMMARY BY PRIORITY

| Priority | Items | Estimated Time |
|----------|-------|----------------|
| 🔴 **CRITICAL** | 1 | ~5 hours |
| 🟡 **HIGH UX** | 9 | ~6 hours |
| 🟢 **MEDIUM** | 4 | ~10 hours |
| 🎯 **MAJOR FEATURES** | 5 | ~72 hours |
| **TOTAL** | **19 items** | **~93 hours** |

---

## ✅ RECENTLY COMPLETED (Dec 9, 2025)

1. ✅ Email Signature System
2. ✅ Font Consistency (Arial everywhere)
3. ✅ Auto-Scroll to Latest Message
4. ✅ Signature Spacing
5. ✅ Mentions Quick Filter Pills (already done)
6. ✅ Group Chat Time Limits (already done)
7. ✅ @Memo Feature (already done)
8. ✅ Typing Indicators (already exists)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### **Phase 1: Critical Fixes (1 day)**
1. 🔐 Password Security (4-6 hours) - **START HERE**
2. ✅ ~~Left Menu Navigation~~ (DONE)
3. ✅ ~~Attachments~~ (DONE)

### **Phase 2: Quick UX Wins (1 day)**
4. Live Chat labels and icons (3-4 hours)
5. Test Post-Chat Survey

### **Phase 3: Shopify Enhancement (2 days)**
6. Shopify data display improvements (8-10 hours)

### **Phase 4: Canned Responses (2 days)**
7. Import and implement 308 templates (8-10 hours)

### **Phase 5: Task Management (1 week)**
8. Task Manager System + Agent (20-30 hours)

### **Phase 6: AI Enhancements (1 week)**
9. @McCarthy Commands (8-10 hours)
10. FAM Agent RAG (8-10 hours)
11. Artwork Analyzer RAG (8-10 hours)

### **Phase 7: Advanced Tagging (1 week)**
12. AI-powered tagging system (12-15 hours)

---

## 📂 REFERENCE DOCUMENTS

- `TODO_LIST.md` - Original TODO (Dec 7)
- `D:\coding\SHOPIFY DATA\Shopify data to display.txt` - Shopify requirements
- `D:\coding\Tagging & Canned Responses\macros-templates-8-12-25.csv` - 308 templates
- `D:\coding\TASK MANAGER\TASK MANAGER SYSTEM and AGENT.txt` - Task Manager spec
- `TAGGING_SYSTEM_ARCHITECTURE.md` - Tagging system design
- `TASK_MANAGEMENT_ARCHITECTURE.md` - Task system design

---

## 🚀 NEXT STEPS

**Immediate:** Fix Password Security (CRITICAL)  
**Then:** Quick UX polish (Live Chat labels, icons)  
**Then:** Shopify enhancements  
**Then:** Canned Responses  
**Then:** Task Management System

---

**Status:** ✅ **Comprehensive and accurate as of Dec 9, 2025**

---

*Last Updated: December 9, 2025, 11:30 PM AEST*

