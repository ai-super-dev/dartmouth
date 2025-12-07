# 📋 Dartmouth OS - TODO List

**Last Updated:** December 7, 2025, 12:00 PM AEST  
**Status:** Active Development

---

## 🔴 CRITICAL FIXES - Broken Features (5 items)

### 1. ❌ Ticket Links in Group Chat - BROKEN
**Issue:** Clicking #254 in group chat says "ticket does not exist"  
**Root Cause:** Search/navigation broken  
**Impact:** Critical - can't navigate to tickets from chat  
**Effort:** 1 hour  
**Status:** Not Started

### 2. ❌ Ticket Links in Mentions - BROKEN
**Issue:** Clicking @254 goes to all tickets instead of opening specific ticket  
**Root Cause:** Navigation logic incorrect  
**Impact:** High - defeats purpose of ticket links  
**Effort:** 1 hour  
**Status:** Not Started

### 3. ❌ Ticket Reassignment - Shows Wrong Status
**Issue:** Shows Gaille/Sam/Ted as offline when they're online, shows "unassigned" as a user  
**Root Cause:** Status detection or user list filtering  
**Impact:** High - can't reassign tickets properly  
**Effort:** 2 hours  
**Status:** Not Started

### 4. ❌ Attachments Fix
**Issue:** Not working correctly in ticket/livechat/widget  
**Details:**
- Files upload but not always clickable/downloadable
- Images not displaying correctly in some views
- Inconsistent behavior across ticket types
**Impact:** Critical feature not fully functional  
**Effort:** 3-4 hours  
**Status:** In Progress (Backend done, UI needs fixes)

### 5. ❌ Left Menu Navigation
**Issue:** Clicking on links causes page to jump/scroll  
**Impact:** Poor UX, disorienting  
**Effort:** 1 hour  
**Status:** Not Started

---

## 🟡 HIGH PRIORITY - UX Improvements (7 items)

### 6. ⏳ Live Chat AI Label
**Issue:** Shows "AI Handling" in Live Chat  
**Fix:** Change to "McCarthy AI"  
**Impact:** Branding consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 7. ⏳ Live Chat Callback Text
**Issue:** `__SHOW_CALLBACK_FORM__` displayed in chat history  
**Fix:** Replace with "CALL BACK REQUEST"  
**Impact:** Looks unprofessional  
**Effort:** 30 minutes  
**Status:** Not Started

### 8. ⏳ Live Chat Default View
**Issue:** Doesn't default to newest ticket with chat messages visible  
**Fix:** Auto-select newest ticket and show messages on page load  
**Impact:** Extra clicks for staff  
**Effort:** 1 hour  
**Status:** Not Started

### 9. ⏳ Platform Dropdown Icons
**Issue:** Icons are inconsistent in the Platforms dropdown  
**Fix:** Standardize all platform icons  
**Impact:** Visual consistency  
**Effort:** 1 hour  
**Status:** Not Started

### 10. ⏳ Phone Icon Fix
**Issue:** Green phone icon on main ticket/queue for callbacks (should be red)  
**Fix:** Use solid red phone icon consistently  
**Impact:** Visual consistency, callback identification  
**Effort:** 30 minutes  
**Status:** Not Started

### 11. ⏳ Email Icon Consistency
**Issue:** Different envelope icons used across the app  
**Fix:** Use same envelope icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 12. ⏳ Live Chat Icon Consistency
**Issue:** Different chat icons used across the app  
**Fix:** Use same chat icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

---

## 🟢 MEDIUM PRIORITY - Feature Enhancements (5 items)

### 13. ⏳ Mentions Quick Filter Pills
**Issue:** No quick filter for read/unread in mentions page  
**Fix:** Add read/unread pill filter buttons  
**Impact:** Faster filtering  
**Effort:** 1 hour  
**Status:** Not Started

### 14. ⏳ Group Chat Edit Time Limit
**Issue:** No time limit on message editing  
**Fix:** Only allow editing within 10 minutes of posting  
**Details:** Show edit timestamp with date/time  
**Impact:** Prevent abuse, maintain message integrity  
**Effort:** 1 hour  
**Status:** Not Started

### 15. ⏳ Group Chat Delete Time Limit
**Issue:** No time limit on message deletion  
**Fix:** Only allow deletion within 10 minutes of posting  
**Details:** No reference needed after deletion  
**Impact:** Prevent abuse, maintain chat history  
**Effort:** 1 hour  
**Status:** Not Started

### 16. ⏳ Shopify Data Formatting
**Issue:** Preview/edit links display could be better formatted  
**Fix:** Reformat how Shopify preview/edit links are displayed  
**Impact:** Better UX for staff  
**Effort:** 2 hours  
**Status:** Not Started

### 17. ⏳ Shopify URL Shortener
**Issue:** Long Shopify URLs in responses  
**Fix:** Add URL shortener + hyperlinks for response area  
**Impact:** Cleaner customer communications  
**Effort:** 3 hours  
**Status:** Not Started

---

## 🎯 NEW FEATURES - To Build (8 major features)

### 18. 📋 Shopify Config Page
**Description:** Create UI to configure what Shopify data to show/hide and formatting  
**Features:**
- Toggle visibility of order fields
- Configure link formatting
- Set default display preferences
**Effort:** 4 hours  
**Status:** Not Started

### 19. 🤖 @McCarthy AI Commands
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

### 20. 📋 Task Management System (MAJOR FEATURE)
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

### 21. 💬 Group Chat - Reply to Message
**Description:** Right-click menu with reply feature  
**Features:**
- Right-click shows context menu
- Select "Reply" option
- Shows original message above input
- Displays threaded reply in chat
- Click original message to jump to it
**Effort:** 4 hours  
**Status:** Not Started

### 22. 📤 Group Chat - Share Message
**Description:** Share messages to other channels  
**Features:**
- Right-click menu option
- Select target channel(s)
- Preserves original context
**Effort:** 3 hours  
**Status:** Not Started

### 23. 📋 Group Chat - Copy Message
**Description:** Copy message text to clipboard  
**Features:**
- Right-click menu option
- Copies plain text
**Effort:** 30 minutes  
**Status:** Not Started

### 24. 📝 Memo Feature
**Description:** Personal messages to yourself for later  
**Features:**
- Works like chat messages
- Supports attachments/photos
- Private to user
- Direct link under channels (@Memo)
**Effort:** 3 hours  
**Status:** Not Started

### 25. 🔗 Direct Links for @Mention and @Memo
**Description:** Add quick access links under channels section  
**Features:**
- @Mention link (goes to mentions page)
- @Memo link (opens memo view)
- Unread count badges
**Effort:** 1 hour  
**Status:** Not Started

### 26. 🔐 Group Chat Permissions System
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

### 27. 🔗 Ticket Staff Notes → Group Chat Auto-Post
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

### 28. 🔐 Password Security - MUST FIX BEFORE PRODUCTION
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
| 🔴 Critical Fixes | 5 | ~9 hours |
| 🟡 High Priority UX | 7 | ~5 hours |
| 🟢 Medium Priority | 5 | ~8 hours |
| 🎯 New Features | 10 | ~47.5 hours |
| 🔐 Security | 1 | ~5 hours |
| **TOTAL** | **28 items** | **~74.5 hours** |

---

## ✅ Recently Completed (Dec 7, 2025)

1. ✅ **Mentions Page UI Overhaul** - Pill-based layout
2. ✅ **Mentions "Go to Chat"** - Navigates to exact message with highlight
3. ✅ **Group Chat Channel Highlighting** - Selected channel shows clearly
4. ✅ **Group Chat Message Highlighting** - Yellow highlight for linked messages
5. ✅ **Ticket Search Auto-Navigate** - Single result auto-opens
6. ✅ **Ticket Search Multiple Formats** - Supports 254, TKT-254, TKT-000254
7. ✅ **Mentions Column Alignment** - No gaps between columns
8. ✅ **Mentions Read/Unread Backgrounds** - Blue for unread, grey for read
9. ✅ **Group Chat Date Formatting** - Full date for old messages
10. ✅ **@ticket Links Open in New Tab** - Both mentions and group chat

---

## 🎯 Recommended Implementation Order

### **Sprint 1: Fix Broken Things (1 week)**
1. Ticket links in Group Chat (#254 navigation)
2. Ticket links in Mentions (@254 navigation)
3. Ticket reassignment status
4. Attachments fixes
5. Left menu navigation scrolling

### **Sprint 2: Quick UX Wins (3 days)**
6. Live Chat AI label → "McCarthy AI"
7. Live Chat callback text
8. Live Chat default view
9. Platform icons consistency
10. Phone/email/chat icon fixes

### **Sprint 3: Feature Enhancements (1 week)**
11. Mentions quick filter pills
12. Group Chat edit/delete time limits
13. Shopify data formatting
14. Shopify URL shortener
15. Shopify config page

### **Sprint 4: Major Features (3-4 weeks)**
16. @McCarthy AI commands
17. Task Management System (biggest feature)
18. Group Chat reply/share/copy
19. Memo feature
20. Group Chat permissions
21. Ticket notes → Group chat auto-post

### **Sprint 5: Security (1 week)**
22. Password hashing implementation

---

**Next Steps:** Start with Sprint 1 - Fix all broken features first before adding new ones.

---

*Last Updated: December 7, 2025, 12:00 PM AEST*
