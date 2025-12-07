# 📋 Dartmouth OS - TODO List

**Last Updated:** December 7, 2025, 10:40 PM AEST  
**Status:** Active Development

---

## 🔴 CRITICAL FIXES - Broken Features (2 items remaining)

### 1. ❌ Left Menu Navigation
**Issue:** Clicking on links causes page to jump/scroll  
**Impact:** Poor UX, disorienting  
**Effort:** 1 hour  
**Status:** Not Started

### 2. ❌ Attachments Fix
**Issue:** Not working correctly in ticket/livechat/widget  
**Details:**
- Files upload but not always clickable/downloadable
- Images not displaying correctly in some views
- Inconsistent behavior across ticket types
**Impact:** Critical feature not fully functional  
**Effort:** 3-4 hours  
**Status:** In Progress (Backend done, UI needs fixes)

---

## 🟡 HIGH PRIORITY - UX Improvements (7 items)

### 3. ⏳ Live Chat AI Label
**Issue:** Shows "AI Handling" in Live Chat  
**Fix:** Change to "McCarthy AI"  
**Impact:** Branding consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 4. ⏳ Live Chat Callback Text
**Issue:** `__SHOW_CALLBACK_FORM__` displayed in chat history  
**Fix:** Replace with "CALL BACK REQUEST"  
**Impact:** Looks unprofessional  
**Effort:** 30 minutes  
**Status:** Not Started

### 5. ⏳ Live Chat Default View
**Issue:** Doesn't default to newest ticket with chat messages visible  
**Fix:** Auto-select newest ticket and show messages on page load  
**Impact:** Extra clicks for staff  
**Effort:** 1 hour  
**Status:** Not Started

### 6. ⏳ Platform Dropdown Icons
**Issue:** Icons are inconsistent in the Platforms dropdown  
**Fix:** Standardize all platform icons  
**Impact:** Visual consistency  
**Effort:** 1 hour  
**Status:** Not Started

### 7. ⏳ Phone Icon Fix
**Issue:** Green phone icon on main ticket/queue for callbacks (should be red)  
**Fix:** Use solid red phone icon consistently  
**Impact:** Visual consistency, callback identification  
**Effort:** 30 minutes  
**Status:** Not Started

### 8. ⏳ Email Icon Consistency
**Issue:** Different envelope icons used across the app  
**Fix:** Use same envelope icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 9. ⏳ Live Chat Icon Consistency
**Issue:** Different chat icons used across the app  
**Fix:** Use same chat icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

---

## 🟢 MEDIUM PRIORITY - Feature Enhancements (5 items)

### 10. ⏳ Mentions Quick Filter Pills
**Issue:** No quick filter for read/unread in mentions page  
**Fix:** Add read/unread pill filter buttons  
**Impact:** Faster filtering  
**Effort:** 1 hour  
**Status:** Not Started

### 11. ⏳ Group Chat Edit Time Limit
**Issue:** No time limit on message editing  
**Fix:** Only allow editing within 10 minutes of posting  
**Details:** Show edit timestamp with date/time  
**Impact:** Prevent abuse, maintain message integrity  
**Effort:** 1 hour  
**Status:** Not Started

### 12. ⏳ Group Chat Delete Time Limit
**Issue:** No time limit on message deletion  
**Fix:** Only allow deletion within 10 minutes of posting  
**Details:** No reference needed after deletion  
**Impact:** Prevent abuse, maintain chat history  
**Effort:** 1 hour  
**Status:** Not Started

### 13. ⏳ Shopify Data Formatting
**Issue:** Preview/edit links display could be better formatted  
**Fix:** Reformat how Shopify preview/edit links are displayed  
**Impact:** Better UX for staff  
**Effort:** 2 hours  
**Status:** Not Started

### 14. ⏳ Shopify URL Shortener
**Issue:** Long Shopify URLs in responses  
**Fix:** Add URL shortener + hyperlinks for response area  
**Impact:** Cleaner customer communications  
**Effort:** 3 hours  
**Status:** Not Started

---

## 🎯 NEW FEATURES - To Build (8 major features)

### 15. 📋 Shopify Config Page
**Description:** Create UI to configure what Shopify data to show/hide and formatting  
**Features:**
- Toggle visibility of order fields
- Configure link formatting
- Set default display preferences
**Effort:** 4 hours  
**Status:** Not Started

### 16. 🤖 @McCarthy AI Commands
**Description:** Allow staff to give McCarthy AI instructions via @mentions  
**Commands:**
- Send message to customer via ticket
- Draft email for review
- Schedule callback
- Update customer on order status
- Fetch Shopify data
**Features:**
- Command parsing
- Task execution
- Notification when complete
- Error handling
**Effort:** 8 hours  
**Status:** Not Started

### 17. 📋 Task Management System (MAJOR FEATURE)
**Description:** Complete task management system for team collaboration  
**Features:**
- Create tasks with deadlines and priority
- Assign to staff members or McCarthy AI
- Task mentions/notifications
- Mark tasks as completed (with timestamp)
- Re-open tasks if needed
- Stakeholder notifications
- Task list view with filters
- Link tasks to tickets
**Database:**
- New `tasks` table
- Task assignments
- Task comments/updates
**Effort:** 15-20 hours  
**Status:** Not Started

### 18. 💬 Group Chat - Reply to Message
**Description:** Right-click menu with reply feature  
**Features:**
- Right-click shows context menu
- Select "Reply" option
- Shows original message above input
- Displays threaded reply in chat
- Click original message to jump to it
**Effort:** 4 hours  
**Status:** Not Started

### 19. 📤 Group Chat - Share Message
**Description:** Share messages to other channels  
**Features:**
- Right-click menu option
- Select target channel(s)
- Preserves original context
**Effort:** 3 hours  
**Status:** Not Started

### 20. 📋 Group Chat - Copy Message
**Description:** Copy message text to clipboard  
**Features:**
- Right-click menu option
- Copies plain text
**Effort:** 30 minutes  
**Status:** Not Started

### 21. 📝 Memo Feature
**Description:** Personal messages to yourself for later  
**Features:**
- Works like chat messages
- Supports attachments/photos
- Private to user
- Direct link under channels (@Memo)
**Effort:** 3 hours  
**Status:** Not Started

### 22. 🔗 Direct Links for @Mention and @Memo
**Description:** Add quick access links under channels section  
**Features:**
- @Mention link (goes to mentions page)
- @Memo link (opens memo view)
- Unread count badges
**Effort:** 1 hour  
**Status:** Not Started

### 23. 🔐 Group Chat Permissions System
**Description:** Configure who can edit/delete messages  
**Features:**
- Admin can always edit/delete
- Configure per-channel permissions
- Staff privilege levels
- Settings UI for permissions
**Database:**
- Channel permissions table
- Staff privilege levels
**Effort:** 5 hours  
**Status:** Not Started

### 24. 🔗 Ticket Staff Notes → Group Chat Auto-Post
**Description:** Mentions in ticket notes auto-post to group chat  
**Example:** `@cs @gaille customer package damaged, organize reprint`  
**Features:**
- Parse mentions in ticket staff notes
- Auto-post to relevant group channel
- Preserve ticket context
- Link back to ticket
**Effort:** 4 hours  
**Status:** Not Started

---

## 🔴 CRITICAL SECURITY ISSUE

### 25. 🔐 Password Security - MUST FIX BEFORE PRODUCTION
**Issue:** Plain text password comparison in authentication  
**Location:** `packages/worker/src/controllers/auth.ts` lines 12-16  
**Risk:** HIGH - All staff passwords vulnerable  
**Fix Required:** Implement bcrypt/argon2 hashing with Web Crypto API  
**Impact:** All staff accounts need password reset after fix  
**Effort:** 4-6 hours  
**Status:** ⚠️ DOCUMENTED - Not Started

---

## 📊 Summary

| Priority | Total Items | Estimated Time |
|----------|-------------|----------------|
| 🔴 Critical Fixes | 2 | ~5 hours |
| 🟡 High Priority UX | 7 | ~5 hours |
| 🟢 Medium Priority | 5 | ~8 hours |
| 🎯 New Features | 10 | ~47.5 hours |
| 🔐 Security | 1 | ~5 hours |
| **TOTAL** | **25 items** | **~70.5 hours** |

---

## ✅ Recently Completed (Dec 7, 2025)

### Mentions System Fixes
1. ✅ **Mentions Page UI Overhaul** - Pill-based layout with all info on one line
2. ✅ **Mentions "Go to Chat"** - Navigates to exact message with yellow highlight
3. ✅ **Mentions Column Alignment** - No gaps between columns, equal heights
4. ✅ **Mentions Read/Unread Backgrounds** - Blue for unread, grey for read
5. ✅ **Mentions Selection Borders** - Blue border for unread, grey for read
6. ✅ **Mentions Default Filter** - Always defaults to "My Mentions"
7. ✅ **Mentions Auto-Select** - First mention auto-selected on page load
8. ✅ **Mentions @by Pill** - Shows who mentioned you in list and detail view
9. ✅ **Mentions Date Format** - Full date/time display
10. ✅ **@ticket Links Open in New Tab** - Both mentions and group chat

### Group Chat Fixes
11. ✅ **Group Chat Channel Highlighting** - Selected channel shows with indigo background and border
12. ✅ **Group Chat Message Highlighting** - Yellow highlight for linked messages with auto-scroll
13. ✅ **Group Chat Date Formatting** - Full date for old messages (>24h)
14. ✅ **@ticket Links Clickable** - Open in new tab with proper search
15. ✅ **Group Chat Message Input** - Removed grey line, aligned send button, single-line input
16. ✅ **Group Chat Badge Behavior** - Auto-clears when viewing channel (by design)

### Ticket System Fixes
17. ✅ **Ticket Search Auto-Navigate** - Single result auto-opens ticket detail
18. ✅ **Ticket Search Multiple Formats** - Supports 254, TKT-254, TKT-000254, @254
19. ✅ **Ticket Number Display** - TKT-173 in tickets, @173 in mentions
20. ✅ **Ticket Links from Mentions** - Click @ticket opens All Tickets with search populated

### Reassignment Modal Fixes
21. ✅ **Reassignment Modal Unified** - Same design for bulk and individual reassignment
22. ✅ **McCarthy AI in List** - Shows with green dot and sparkles icon
23. ✅ **Real Staff Status** - Fetches from API, shows online/away/offline correctly
24. ✅ **Reason Field** - Optional textarea at bottom for reassignment reason
25. ✅ **Remove Assignment** - Clearer label and description, no border line

### Mentions Backend Fixes (CRITICAL)
26. ✅ **Self-Mentions Enabled** - All staff can mention themselves in Group Chat and Ticket Notes
27. ✅ **@all Includes Sender** - Consistent behavior across all mention types
28. ✅ **Numeric Mentions Skipped** - @173 treated as ticket reference, not staff mention
29. ✅ **Staff Table Name Fixed** - Changed FROM staff to FROM staff_users
30. ✅ **Ticket Platform Icons** - Email, Phone, Chat icons display correctly in mentions
31. ✅ **Group Chat Mentions Fixed** - SQL JOIN corrected to include context_type='group_chat'
32. ✅ **Mention Timestamps Fixed** - ISO 8601 format with timezone for proper sorting and display

---

## 🎯 Recommended Implementation Order

### **Sprint 1: Fix Broken Things (CURRENT - 2 items remaining)**
1. ✅ ~~Ticket links in Group Chat (#254 navigation)~~ - COMPLETED
2. ✅ ~~Ticket links in Mentions (@254 navigation)~~ - COMPLETED
3. ✅ ~~Ticket reassignment status~~ - COMPLETED
4. ✅ ~~Group Chat mentions not appearing~~ - COMPLETED
5. ✅ ~~Group Chat mention timestamps wrong~~ - COMPLETED
6. ❌ Left menu navigation scrolling
7. ❌ Attachments fixes

### **Sprint 2: Quick UX Wins (3 days)**
8. Live Chat AI label → "McCarthy AI"
9. Live Chat callback text
10. Live Chat default view
11. Platform icons consistency
12. Phone/email/chat icon fixes

### **Sprint 3: Feature Enhancements (1 week)**
13. Mentions quick filter pills
14. Group Chat edit/delete time limits
15. Shopify data formatting
16. Shopify URL shortener
17. Shopify config page

### **Sprint 4: Major Features (3-4 weeks)**
18. @McCarthy AI commands
19. Task Management System (biggest feature)
20. Group Chat reply/share/copy
21. Memo feature
22. Group Chat permissions
23. Ticket notes → Group chat auto-post

### **Sprint 5: Security (1 week)**
24. Password hashing implementation

---

**Next Steps:** Complete Sprint 1 (Left menu navigation + Attachments) before moving to Sprint 2.

---

*Last Updated: December 7, 2025, 10:40 PM AEST*
