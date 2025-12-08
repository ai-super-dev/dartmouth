# 🔄 CURSOR REBOOT INSTRUCTIONS

**Date:** December 7, 2025, 11:55 AM AEST  
**Status:** 🔴 CRITICAL BUG - Group Chat mentions not appearing on Mentions page

---

## 📋 COPY THIS ENTIRE MESSAGE TO AI AFTER REBOOT

**CONTEXT:**
We're fixing a CRITICAL bug where Group Chat mentions are not appearing on the Mentions page, even though they're being created successfully in the database.

**WHAT I'VE DONE:**
1. ✅ Identified the bug: SQL JOIN in `getMentions` query was filtering out Group Chat mentions
2. ✅ Fixed line 129 in `packages/worker/src/controllers/mentions.ts`:
   - Changed: `LEFT JOIN tickets t ON m.context_type = 'ticket_note' AND m.ticket_id = t.ticket_id`
   - To: `LEFT JOIN tickets t ON m.ticket_id = t.ticket_id`
3. ✅ Deployed to production (Version: 027f2ced-a06e-46fe-93e6-9d157d99e057)
4. ✅ Updated TODO list and PROJECT_PROGRESS.md

**WHAT YOU NEED TO DO:**
1. Start wrangler tail to capture logs:
   ```powershell
   cd D:\coding\DARTMOUTH_OS_PROJECT\packages\worker
   npx wrangler tail dartmouth-os-worker --format pretty
   ```
   (Leave this running in the background)

2. In browser (as Admin at https://master.dartmouth-os-dashboard.pages.dev):
   - Go to Group Chat
   - Send a test mention: `@john test message for debugging`

3. Check the terminal logs for:
   - `[Group Chat] Message content: @john test message for debugging`
   - `[Group Chat] Parsed mentions: 1`
   - `[Group Chat] Mentions created successfully`

4. Go to Mentions page and refresh (Ctrl+F5)

5. **Copy the ENTIRE terminal output** and paste it back to me

6. Tell me:
   - Did the Group Chat mention appear on the Mentions page? (YES/NO)
   - How many total mentions are showing?
   - What does the Group Chat mention look like (screenshot if possible)?

**TERMINAL LOGS LOCATION:**
The wrangler tail output will be in a new terminal file in `c:\Users\johnp\.cursor\projects\d-coding-DARTMOUTH-OS-PROJECT\terminals\`

---

## 📚 LATEST DOCUMENTATION - READ THESE FIRST

### **1. PROJECT_PROGRESS.md** (MOST IMPORTANT - READ FIRST)
- **Location:** `D:\coding\DARTMOUTH_OS_PROJECT\PROJECT_PROGRESS.md`
- **Contains:** Full project history, all recent changes, bug fixes, deployment info
- **Last Updated:** December 7, 2025, 11:55 AM AEST
- **READ THE LAST 3 ENTRIES** for current context

### **2. TODO_LIST.md** (CURRENT TASKS)
- **Location:** `D:\coding\DARTMOUTH_OS_PROJECT\TODO_LIST.md`
- **Contains:** All pending tasks organized by priority (5 sprints)
- **Current Focus:** Sprint 1 - Fix Broken Things (Critical Fixes)
- **Current Task:** Fix Group Chat mentions not appearing (IN PROGRESS)

### **3. GROUP_CHAT_ARCHITECTURE.md** (MENTIONS SYSTEM SPEC)
- **Location:** `D:\coding\DARTMOUTH_OS_PROJECT\GROUP_CHAT_ARCHITECTURE.md`
- **Contains:** Complete @Mentions system architecture and specifications
- **Includes:** Database schema, API endpoints, frontend design, use cases

### **4. BUILD_PLAN.md** (IMPLEMENTATION ROADMAP)
- **Location:** `D:\coding\DARTMOUTH_OS_PROJECT\BUILD_PLAN.md`
- **Contains:** 5-phase implementation plan for @Mentions system
- **Status:** Phases 1-3 complete, Phase 4 in progress

---

## 🔑 KEY FILES TO UNDERSTAND

**Backend (Cloudflare Workers):**
- `packages/worker/src/controllers/mentions.ts` - **JUST MODIFIED** (line 129 SQL JOIN fix)
- `packages/worker/src/controllers/group-chat.ts` - Group Chat message handling
- `packages/worker/src/controllers/tickets.ts` - Ticket Staff Notes mentions

**Frontend (React Dashboard):**
- `packages/customer-service-dashboard/src/pages/MentionsPage.tsx` - Mentions UI
- `packages/customer-service-dashboard/src/pages/GroupChatPage.tsx` - Group Chat UI

**Database:**
- Cloudflare D1: `agent-army-db`
- Key tables: `mentions`, `group_chat_messages`, `group_chat_channels`, `internal_notes`, `tickets`

---

## 🌐 DEPLOYMENT URLS

- **Frontend Dashboard:** https://master.dartmouth-os-dashboard.pages.dev
- **Backend API:** https://dartmouth-os-worker.dartmouth.workers.dev
- **Test Accounts:**
  - Admin: `john@dtf.com.au` / (ask user for password)
  - Staff: `gaille@dtf.com.au` / `test123`

---

## 📁 PROJECT STRUCTURE

```
D:\coding\DARTMOUTH_OS_PROJECT\
├── PROJECT_PROGRESS.md          ← READ THIS FIRST
├── TODO_LIST.md                 ← CURRENT TASKS
├── GROUP_CHAT_ARCHITECTURE.md   ← MENTIONS SPEC
├── BUILD_PLAN.md                ← IMPLEMENTATION PLAN
├── REBOOT_INSTRUCTIONS.md       ← THIS FILE
├── packages/
│   ├── worker/                  ← Backend (Cloudflare Workers)
│   │   └── src/controllers/
│   │       ├── mentions.ts      ← JUST FIXED (line 129)
│   │       ├── group-chat.ts
│   │       └── tickets.ts
│   └── customer-service-dashboard/  ← Frontend (React)
│       └── src/pages/
│           ├── MentionsPage.tsx
│           └── GroupChatPage.tsx
```

---

## ⚡ QUICK CONTEXT SUMMARY

### **What We've Built:**
- ✅ Full @Mentions system (Group Chat + Ticket Staff Notes)
- ✅ Self-mentions working for all staff
- ✅ @all mentions working everywhere
- ✅ Ticket Staff Notes mentions with platform icons (Email, Phone, Chat)
- ✅ Beautiful Mentions page UI with pills and filters
- ✅ Auto-navigate to ticket from @ticket links
- ✅ "Go to Chat" button navigates to exact message with highlight
- ✅ Mark as Read/Unread functionality with persistence
- ✅ Ticket number formats: `TKT-173` in tickets, `@173` in mentions

### **Current Bug:**
- 🔴 Group Chat mentions created in DB but NOT showing on Mentions page
- **Root cause:** SQL JOIN filtering out `context_type = 'group_chat'` rows
- **Fix deployed:** Changed JOIN condition to not filter by context_type
- **Status:** Needs testing verification

### **What You're Testing:**
1. Send Group Chat mention: `@john test message`
2. Check logs show mention created
3. Verify mention appears on Mentions page
4. Provide terminal output for analysis

---

## 🔧 DEPLOYMENT COMMANDS

**Backend Deploy:**
```powershell
cd D:\coding\DARTMOUTH_OS_PROJECT\packages\worker
npx wrangler deploy
```

**Frontend Deploy:**
```powershell
cd D:\coding\DARTMOUTH_OS_PROJECT\packages\customer-service-dashboard
npm run build
npx wrangler pages deploy dist --project-name=dartmouth-os-dashboard --branch=master --commit-dirty=true
```

**View Logs:**
```powershell
cd D:\coding\DARTMOUTH_OS_PROJECT\packages\worker
npx wrangler tail dartmouth-os-worker --format pretty
```

**Database Query:**
```powershell
npx wrangler d1 execute agent-army-db --remote --command "SELECT * FROM mentions WHERE mentioned_staff_id = 'staff-af45c90b' ORDER BY created_at DESC LIMIT 10"
```

---

## 🚨 KNOWN ISSUES

1. **🔴 SECURITY:** Passwords stored as plain text (not bcrypt) - MUST FIX BEFORE PRODUCTION
2. **🔴 CRITICAL:** Group Chat mentions not appearing on Mentions page - IN PROGRESS
3. **⚠️ Attachments:** Not working correctly in ticket/livechat/widget
4. **⚠️ Left Menu:** Page jumps/scrolls when clicking links

---

## 📝 RECENT CHANGES (Last 24 Hours)

### **Mentions Page:**
- ✅ Redesigned to single-line pill layout
- ✅ Added platform icons for ticket mentions (Email, Phone, Chat)
- ✅ Fixed selection border styling (blue for unread, grey for read)
- ✅ Fixed ticket links to auto-navigate to specific ticket
- ✅ Added "Go to Chat" button with message highlighting
- ✅ Fixed date format to show full date/time

### **Group Chat:**
- ✅ Removed grey line above message input
- ✅ Aligned send button with input field
- ✅ Changed textarea to single-line input
- ✅ Added channel selection highlighting
- ✅ Fixed message highlighting when navigating from Mentions

### **Ticket Staff Notes:**
- ✅ Implemented @mentions parsing and creation
- ✅ Self-mentions now work for all staff
- ✅ @all includes sender for consistency
- ✅ Fixed table name bug (staff → staff_users)
- ✅ Added message content to mentions query

### **Backend:**
- ✅ Removed self-mention restrictions in Group Chat and Ticket Notes
- ✅ Added numeric mention filtering (skip @123 as they're ticket refs)
- ✅ Added ticket_channel to mentions query for platform icons
- ✅ Fixed SQL JOIN to not filter out Group Chat mentions (LATEST FIX)

---

## 🎯 NEXT STEPS AFTER BUG FIX

**Sprint 1: Fix Broken Things (Critical Fixes)**
- ❌ Left menu navigation - Page jumps/scrolls when clicking links
- ❌ Attachments - Still not working correctly in ticket/livechat/widget

**Sprint 2: Quick UX Wins (High Priority UX)**
- ❌ Live Chat AI label - Should say "McCarthy AI" instead of "AI Handling"
- ❌ Live Chat Callback Text - Replace `__SHOW_CALLBACK_FORM__` with "CALL BACK REQUEST"
- ❌ Live Chat Default View - Should open newest ticket and show chat messages
- ❌ Platform Icons - Make all consistent (phone, email, live chat)
- ❌ Phone Icon Color - Green on main ticket/queue (should be red for callbacks)
- ❌ Mentions Quick Filter - Add read/unread pill filter

**Sprint 5: Security**
- 🔴 SECURITY: Implement bcrypt/argon2 password hashing

---

## 💡 TIPS FOR AI

1. **Always read PROJECT_PROGRESS.md first** - It has the full context
2. **Check TODO_LIST.md** - Know what's pending vs completed
3. **Terminal commands timeout** - Ask user to run them manually if stuck
4. **Use flags 🚩** - If waiting on response, tell user you're not stuck
5. **PowerShell syntax** - Use `;` not `&&` for chaining commands
6. **Wrangler tail** - Run in background, read from terminals folder
7. **Test thoroughly** - User is frustrated, don't break things further

---

**THAT'S EVERYTHING YOU NEED TO GET BACK UP TO SPEED!** 🚀





