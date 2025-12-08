# 🔄 REBOOT INSTRUCTIONS - December 8, 2025

## 📋 **GIVE ME THESE EXACT INSTRUCTIONS:**

```
Please read these files in order to get up to speed:

1. D:\coding\DARTMOUTH_OS_PROJECT\START_HERE_TOMORROW.md
2. D:\coding\DARTMOUTH_OS_PROJECT\PROJECT_PROGRESS.md (focus on December 7-8 section and TODO list at the end)
3. D:\coding\DARTMOUTH_OS_PROJECT\GROUP_CHAT_ARCHITECTURE.md
4. D:\coding\DARTMOUTH_OS_PROJECT\MASTER_BUILD_PLAN_DEC_2_2025.md

After reading, complete these tasks autonomously (use --yes and --force flags):

1. ⏳ Mentions: Quick filter pills (Read/Unread, Shift+Click) ⭐ START HERE
2. ⏳ Group Chat Settings: Configurable edit/delete timeframe (Global setting)
3. ⏳ @Memo feature (Personal notes with attachments)
4. 🐛 FIX: Cannot create new channel groups in Group Chat settings

Deploy everything when complete. I'll test when I wake up.
```

---

## 📄 **DOCUMENTATION LOCATIONS:**

### **Primary Handover Document:**
- **Path:** `D:\coding\DARTMOUTH_OS_PROJECT\START_HERE_TOMORROW.md`
- **Contains:** 
  - Complete list of December 7-8 achievements
  - Detailed specs for next 3 features
  - Implementation notes
  - Current state and deployed URLs

### **Progress Tracker:**
- **Path:** `D:\coding\DARTMOUTH_OS_PROJECT\PROJECT_PROGRESS.md`
- **Focus On:**
  - Lines 1-150: December 7-8 achievements section
  - Lines 900+: Comprehensive TODO list at end

### **Architecture Document:**
- **Path:** `D:\coding\DARTMOUTH_OS_PROJECT\GROUP_CHAT_ARCHITECTURE.md`
- **Contains:**
  - All implemented features
  - Database schema
  - API endpoints
  - Current status: Production

### **Build Plan:**
- **Path:** `D:\coding\DARTMOUTH_OS_PROJECT\MASTER_BUILD_PLAN_DEC_2_2025.md`
- **Contains:**
  - Overall project status
  - Component completion percentages
  - Current priorities

---

## 🎯 **TASKS TO COMPLETE (Autonomous):**

### **1. Mentions Quick Filter Pills** ⭐ **START HERE**
**File:** `packages/customer-service-dashboard/src/pages/MentionsPage.tsx`
**Time:** 2-3 hours

**Features:**
- Add Read/Unread filter pills opposite "Filter >" button
- Shift+Click to multi-select mentions
- Clicking pill toggles status (Read ↔ Unread)
- Show count (e.g., "Unread (5)")
- Batch API update

**Implementation:**
- Add state: `selectedMentionIds: string[]`
- Add handler for Shift+Click selection
- Add batch update mutation
- Style pills similar to existing Date/Time pills

---

### **2. Group Chat Settings - Configurable Timeframe**
**File:** `packages/customer-service-dashboard/src/pages/GroupChatSettingsPage.tsx`
**Time:** 3-4 hours

**Features:**
- GLOBAL setting (not per-channel)
- Dropdown: 5min, 10min, 15min, 30min, 1hr, No limit
- Admin-only
- Default: 10 minutes

**Backend:**
- Store in KV: `group_chat_edit_delete_time_limit`
- API endpoints: GET/SET `/api/group-chat/settings/time-limit`
- Update `editMessage` and `deleteMessage` to check global setting

**Frontend:**
- Add dropdown in settings
- Fetch on page load
- Update `canEditOrDelete` helper

---

### **3. @Memo Feature**
**New Files:** 
- `packages/customer-service-dashboard/src/pages/MemoPage.tsx`
- Backend: Add to `packages/worker/src/controllers/memos.ts`
**Time:** 4-6 hours

**Features:**
- Personal notes to self
- Attachments support
- New sidebar link under @Mentions
- Similar UI to Group Chat but private

**Database:**
- Table: `staff_memos` (id, staff_id, content, attachment_url, created_at)
- Migration: Create new migration file

**Implementation:**
- Copy GroupChatPage.tsx structure
- Simplify (no channels, no members)
- Filter by current user only
- Add route in App.tsx

---

### **4. BUG FIX: Cannot Create New Channels**
**File:** `packages/customer-service-dashboard/src/pages/GroupChatSettingsPage.tsx`
**Priority:** HIGH - Fix first!

**Issue:** Create channel functionality broken
**Check:**
- Modal display logic
- Form submission handler
- API call
- Backend endpoint

---

## 🚀 **DEPLOYMENT CHECKLIST:**

After completing all features:

```bash
# Frontend
cd packages/customer-service-dashboard
npm run build
npx wrangler pages deploy dist --project-name=dartmouth-os-dashboard --branch=master --commit-dirty=true

# Backend (if changes made)
cd ../worker
npx wrangler deploy

# Commit
cd ../..
git add .
git commit -m "Features: Mentions filters, configurable timeframe, @Memo + Fix: channel creation"
git push
```

---

## 📊 **CURRENT STATE:**

**Deployed URLs:**
- Frontend: https://master.dartmouth-os-dashboard.pages.dev
- Backend: https://dartmouth-os-worker.dartmouth.workers.dev

**Last Backup:**
- `D:\coding\DARTMOUTH_OS_PROJECT\backup\backup_2025-12-08_02-03-09\`

**GitHub:**
- Repository: https://github.com/hutchisonjohn/dartmouth.git
- Branch: master
- Last commit: "Group Chat & Mentions Complete (Phases 1-3)"

---

## 🔧 **IMPORTANT FLAGS TO USE:**

**Always use these to avoid getting stuck:**
- `npm install --yes`
- `git add . --force` (if needed)
- `npx wrangler deploy --yes`
- Non-interactive mode for all commands

---

## ✅ **COMPLETION CRITERIA:**

**Test these when complete:**
1. ✅ Mentions page has Read/Unread pills that work with Shift+Click
2. ✅ Group Chat Settings has timeframe dropdown (global setting)
3. ✅ @Memo page exists in sidebar and works like Group Chat
4. ✅ Can create new channels in Group Chat Settings
5. ✅ All deployed to production
6. ✅ All committed to GitHub

---

**READY TO REBOOT AND EXECUTE AUTONOMOUSLY!** 🚀


