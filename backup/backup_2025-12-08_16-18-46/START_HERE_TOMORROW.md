# 🚀 START HERE - December 8, 2025

## ✅ COMPLETED TODAY (December 7, 2025)

### **Group Chat & Mentions - Phases 1-3 COMPLETE!**

#### **Group Chat Features:**
1. ✅ Edit/Delete with 10-minute time limits (staff only)
2. ✅ Admin can edit/delete anytime (no time limit)
3. ✅ Edit timestamps - Always show date + time (e.g., "edited Dec 7, 12:38 AM")
4. ✅ Edit/Delete attachments - Checkbox to remove attachment when editing
5. ✅ Right-click context menu:
   - ✅ Copy message to clipboard
   - ✅ Reply to message (shows reply preview above input)
   - ✅ Share to other channels (with comment + mentions + attachments)
6. ✅ Profile pictures everywhere:
   - ✅ Chat messages
   - ✅ Members list (right sidebar)
   - ✅ Mention suggestions dropdown
7. ✅ Attachment downloads:
   - ✅ Download button for all files (PDFs, documents)
   - ✅ Floating download button for images (top-right corner)
   - ✅ Proper download with correct filenames
8. ✅ Ticket number links - `#122` in chat opens ticket in new tab

#### **Mentions Features:**
1. ✅ Attachments display:
   - ✅ Show attachment indicator in mention list (📎 icon + filename)
   - ✅ Clicking attachment navigates to Group Chat message
   - ✅ Detail view shows attachment info
2. ✅ Profile pictures in mentions
3. ✅ Click "Go to Chat" navigates to exact message with highlighting
4. ✅ Proper sorting (newest first) and timestamps (local time)

#### **Bug Fixes:**
- ✅ Fixed duplicate message sending
- ✅ Fixed message polling frequency (2s → 5s)
- ✅ Fixed avatar_url vs profile_picture column name
- ✅ Fixed attachment links in mentions (navigate instead of open)

---

## 🎯 NEXT PRIORITIES (Start Tomorrow)

### **1. MENTIONS - QUICK FILTER PILLS** ⭐ **START HERE**
**Location:** `packages/customer-service-dashboard/src/pages/MentionsPage.tsx`

**What to build:**
- Add Read/Unread filter pills opposite the "Filter >" button (to the right)
- Shift+Click to multi-select mentions
- Clicking pill changes status (Read ↔ Unread)
- Visual design:
  - Pills similar to existing Date/Time pills
  - Active state when selected
  - Show count (e.g., "Unread (5)")

**Implementation notes:**
- Add state for selected mention IDs
- Handle Shift+Click for multi-select
- Batch update API call for multiple mentions
- Update UI optimistically

---

### **2. GROUP CHAT SETTINGS - CONFIGURABLE EDIT/DELETE TIMEFRAME**
**Location:** `packages/customer-service-dashboard/src/pages/GroupChatSettingsPage.tsx`

**What to add:**
- **GLOBAL setting** for edit/delete time limit (applies to ALL channels)
- Options:
  - 5 minutes
  - 10 minutes (default)
  - 15 minutes
  - 30 minutes
  - 1 hour
  - No limit (always allow)
- Admin-only setting
- Stored in system configuration

**Backend changes needed:**
- Store in KV namespace or app config: `group_chat_edit_delete_time_limit` (integer, minutes, 0 = no limit)
- Update `editMessage` and `deleteMessage` functions to check global setting
- Default to 10 minutes if not set
- API endpoint to get/set the global setting

**Frontend changes:**
- Add dropdown in Group Chat Settings (global settings section)
- Update `canEditOrDelete` helper to use global setting
- Fetch global setting on app load or Group Chat page load
- Store in React state or context

---

## 📊 CURRENT STATE

### **Deployed URLs:**
- Frontend: https://master.dartmouth-os-dashboard.pages.dev
- Backend: https://dartmouth-os-worker.dartmouth.workers.dev

### **Key Files Modified Today:**
1. `packages/customer-service-dashboard/src/pages/GroupChatPage.tsx`
   - Added profile pictures
   - Added share modal with comments
   - Added reply functionality
   - Added download handlers
   - Added right-click context menu

2. `packages/customer-service-dashboard/src/pages/MentionsPage.tsx`
   - Added attachment display
   - Made attachments clickable to navigate to Group Chat
   - Updated icons and styling

3. `packages/worker/src/controllers/group-chat.ts`
   - Added profile_picture (avatar_url) to all message queries
   - Added avatar_url to members query
   - Added 10-minute time limits for edit/delete
   - Admin exemption from delete time limit

4. `packages/worker/src/controllers/mentions.ts`
   - Added attachment fields to mentions query
   - Fixed SQL JOIN for Group Chat mentions

---

## 🔄 REMAINING TODO (After Mentions Filters)

1. ⏳ **@Memo Feature** - Personal notes to self with attachments
2. ⏳ **Attachments** - General fixes across ticket/livechat/widget
3. ⏳ **Agent Upgrades** - FAM Agent & Artwork Analyzer with RAG
4. ⏳ **Shopify Integration** - Data display, URL shortener, configuration
5. ⏳ **Task Management** - Full system with McCarthy AI Task Manager

---

## 📝 NOTES

### **Current Permissions System:**
- **Staff:** Can edit/delete own messages within 10 minutes
- **Admin:** Can edit/delete any message anytime
- Backend checks in `group-chat.ts`:
  - `editMessage` - 10-min check for non-admins
  - `deleteMessage` - 10-min check for non-admins, admins exempt

### **Profile Picture Implementation:**
- Database column: `staff_users.avatar_url`
- Frontend helper: `staffApi.getAvatarUrl()` converts path to full URL
- Fallback to initials if no picture or image fails to load

### **Attachment Download:**
- Uses `handleDownloadFile()` function
- Fetches file as blob, creates temporary URL, triggers download
- Works for cross-origin URLs (R2 storage)

---

## 🚀 READY TO START TOMORROW!

**Priority 1:** Mentions Quick Filter Pills (Read/Unread with Shift+Click)
**Priority 2:** Group Chat Settings - Configurable edit/delete timeframe

All Group Chat & Mentions polish (Phases 1-3) is complete and working beautifully! 🎉

