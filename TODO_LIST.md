# 📋 Dartmouth OS - TODO List

**Last Updated:** December 6, 2025, 8:30 AM AEST  
**Status:** Active Development

---

## 🔴 HIGH PRIORITY - UX Issues (5 items)

### 1. ⏳ Left Menu Navigation
**Issue:** Clicking on links causes page to jump/scroll  
**Impact:** Poor UX, disorienting  
**Effort:** 1 hour  
**Status:** Not Started

### 2. ⏳ Live Chat Callback Text
**Issue:** `__SHOW_CALLBACK_FORM__` displayed in chat history  
**Fix:** Replace with "CALL BACK REQUEST"  
**Impact:** Looks unprofessional  
**Effort:** 30 minutes  
**Status:** Not Started

### 3. ⏳ AI Handling Label
**Issue:** Shows "AI Handling" in Live Chat  
**Fix:** Change to "McCarthy AI"  
**Impact:** Branding consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 4. ⏳ Attachments Fix
**Issue:** Not working correctly in ticket/livechat/widget  
**Details:**
- Files upload but not always clickable/downloadable
- Images not displaying correctly in some views
- Inconsistent behavior across ticket types
**Impact:** Critical feature not fully functional  
**Effort:** 3-4 hours  
**Status:** In Progress (Backend done, UI needs fixes)

### 5. ⏳ Live Chat Default View
**Issue:** Doesn't default to newest ticket with chat messages visible  
**Fix:** Auto-select newest ticket and show messages on page load  
**Impact:** Extra clicks for staff  
**Effort:** 1 hour  
**Status:** Not Started

---

## 🟡 MEDIUM PRIORITY - Icons/Consistency (4 items)

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

### 8. ⏳ Email Icon
**Issue:** Different envelope icons used across the app  
**Fix:** Use same envelope icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

### 9. ⏳ Live Chat Icon
**Issue:** Different chat icons used across the app  
**Fix:** Use same chat icon everywhere  
**Impact:** Visual consistency  
**Effort:** 30 minutes  
**Status:** Not Started

---

## 🟢 LOW PRIORITY - Shopify Enhancements (3 items)

### 10. ⏳ Shopify Data Formatting
**Issue:** Preview/edit links display could be better formatted  
**Fix:** Reformat how Shopify preview/edit links are displayed  
**Impact:** Better UX for staff  
**Effort:** 2 hours  
**Status:** Not Started

### 11. ⏳ Shopify URL Shortener
**Issue:** Long Shopify URLs in responses  
**Fix:** Add URL shortener + hyperlinks for response area  
**Impact:** Cleaner customer communications  
**Effort:** 3 hours  
**Status:** Not Started

### 12. ⏳ Shopify Config Page
**Issue:** No way to configure what Shopify data to show/hide  
**Fix:** Create UI to configure display and formatting  
**Impact:** Customization for staff workflow  
**Effort:** 4 hours  
**Status:** Not Started

---

## 🎯 FUTURE FEATURES - @Mentions System

**Status:** 📋 Fully Documented (Dec 6, 2025)  
**Documentation:** `GROUP_CHAT_ARCHITECTURE.md`  
**Total Estimated Time:** 25 hours

### Phase 1: Basic @mentions in Group Chat (4 hours)
- [ ] Parse @mentions in messages (`@all`, `@staffname`)
- [ ] Create `mentions` database table
- [ ] Display highlighted @mentions in messages
- [ ] Basic autocomplete dropdown when typing `@`

### Phase 2: @Mentions Page (6 hours)
- [ ] Build dual-pane UI (list + details)
- [ ] Implement filters (channel, staff, time, status)
- [ ] Mark as read/unread functionality
- [ ] Link to tickets/channels from mentions

### Phase 3: Cross-System Mentions (4 hours)
- [ ] Ticket Staff Notes → Group chat auto-posting
- [ ] Context preservation (ticket info, customer name)
- [ ] Direct ticket linking from mentions

### Phase 4: McCarthy AI Integration (8 hours)
- [ ] Parse `@mccarthy` commands
- [ ] Implement AI actions:
  - [ ] Send message to customer via ticket
  - [ ] Draft email for review
  - [ ] Schedule callback
  - [ ] Update customer on order status
  - [ ] Fetch Shopify data
- [ ] Notification system when AI completes tasks
- [ ] Error handling and fallbacks

### Phase 5: Notifications (3 hours)
- [ ] In-app badges (unread count)
- [ ] Desktop notifications
- [ ] Email digests (optional)

---

## 📊 Summary

| Priority | Total Items | Estimated Time |
|----------|-------------|----------------|
| 🔴 High | 5 | ~7 hours |
| 🟡 Medium | 4 | ~2.5 hours |
| 🟢 Low | 3 | ~9 hours |
| 🎯 Future (@Mentions) | 5 phases | ~25 hours |
| **TOTAL** | **12 + Future** | **~43.5 hours** |

---

## ✅ Recently Completed

1. ✅ **Main tickets - newest message first** (Dec 5, 2025)
2. ✅ **Group Chat System** (Dec 6, 2025, 2:00 AM)
3. ✅ **Group Chat Settings Page** (Dec 6, 2025, 7:00 AM)
4. ✅ **Group Chat Column Heights Fixed** (Dec 6, 2025, 8:00 AM)
5. ✅ **Shopify Integration** (Dec 5, 2025)
6. ✅ **Shopify Order Navigation** (Dec 5, 2025)
7. ✅ **Shopify Product Metadata** (Dec 5, 2025)
8. ✅ **Callback Feature** (Dec 5, 2025)
9. ✅ **File Attachments Backend** (Dec 5, 2025)
10. ✅ **R2 Storage Integration** (Dec 5, 2025)

---

## 🎯 Key @Mentions Use Cases (For Reference)

### Example 1: Staff to Staff in Ticket
```
In Ticket TKT-000261 Staff Notes:
"@cs @gaille the customers package arrived damaged, can someone organise a reprint please"
```
**Result:** Both @cs channel and @gaille are notified, message auto-posts to #customer-service group chat

### Example 2: McCarthy AI - Send Message
```
"@mccarthy please get back to the customer via TKT-000261 and give her the tracking link"
```
**Result:** AI fetches tracking, sends message to customer, notifies staff when complete

### Example 3: McCarthy AI - Draft Email
```
"@mccarthy draft an email response for TKT-000261 and notify me when ready for review"
```
**Result:** AI drafts email, saves as draft, sends notification to staff

### Example 4: McCarthy AI - Schedule Callback
```
"@mccarthy schedule a callback for me with Jane and TKT-000261"
```
**Result:** AI creates callback task, adds to staff calendar, sends confirmation

### Example 5: Notify All
```
"@all team meeting in 5 minutes in the conference room"
```
**Result:** Everyone in the channel receives a notification

---

**Next Steps:** Tackle High Priority UX issues first, then Medium Priority consistency fixes, then Low Priority Shopify enhancements. @Mentions system to be implemented after current TODO list is complete.

---

*Last Updated: December 6, 2025, 8:30 AM AEST*

