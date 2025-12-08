# 💬 GROUP CHAT SYSTEM - ARCHITECTURE DOCUMENT

**Created:** December 6, 2025, 1:00 AM AEST  
**Last Updated:** December 8, 2025  
**Status:** ✅ **PRODUCTION - Phases 1-3 Complete**  
**Version:** 3.0 (Full feature set with edit/delete, share, reply, attachments)

---

## 🎯 **OBJECTIVE**

Build an **internal team chat system** for staff members to communicate with each other, separate from customer-facing live chat.

---

## ✅ **IMPLEMENTED FEATURES (December 2025)**

### **Core Messaging:**
- ✅ Real-time chat with 5-second polling
- ✅ Multiple channels with descriptions
- ✅ @mentions with notifications (staff and @all)
- ✅ Message threading with reply functionality
- ✅ Profile pictures in messages, member list, and mention dropdown
- ✅ Timestamp display with date formatting

### **Message Management:**
- ✅ **Edit messages** - 10-minute window for staff, anytime for admins
- ✅ **Delete messages** - 10-minute window for staff, anytime for admins
- ✅ **Edit timestamps** - Always shows date + time (e.g., "edited Dec 7, 12:38 AM")
- ✅ **Edit/Delete attachments** - Can remove attachments when editing
- ✅ **Soft deletes** - Messages marked as deleted, not removed from database

### **Attachments:**
- ✅ File uploads to R2 storage
- ✅ Image preview in chat
- ✅ Download button for all file types
- ✅ Floating download button on images (top-right corner)
- ✅ Proper filename handling on download

### **Advanced Features:**
- ✅ **Right-click context menu:**
  - Copy message to clipboard
  - Reply to message (shows preview above input)
  - Share to other channels
- ✅ **Share with comments:**
  - Add your own message with mentions
  - Shows who shared it
  - Includes attachments from original message
- ✅ **Ticket number links** - `#122` opens ticket in new tab
- ✅ **Member management** - Add/remove members, role assignment

### **Tagging System:**
- ✅ **Tag syntax** - `@tag {keyword}` for inline tagging
- ✅ **Auto-parsing** - Backend extracts tags from messages
- ✅ **Tag storage** - Comma-separated in database
- 🚧 **Tag display** - Show tags as clickable pills (in progress)
- 🚧 **Tag search** - Filter messages by tag (in progress)
- ✅ **Channel settings** - Configure permissions, descriptions

### **Permissions System:**
- ✅ **Staff:** Can edit/delete own messages within 10 minutes
- ✅ **Admin:** Can edit/delete any message anytime
- ✅ **Channel-based:** Edit/delete can be enabled/disabled per channel
- ⏳ **Global timeframe setting** - Configurable edit/delete time limit (coming soon)

### **Integration with Mentions:**
- ✅ Mentions created from Group Chat messages
- ✅ Attachments visible in Mentions page
- ✅ Click attachment to navigate to Group Chat message
- ✅ "Go to Chat" highlights and scrolls to specific message

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Core Components:**

1. **Backend API** (Cloudflare Worker)
   - Channel management (create, list, archive)
   - Message handling (send, receive, edit, delete)
   - Member management (add, remove, permissions)
   - File attachments (R2 storage integration)
   - Real-time polling endpoint

2. **Frontend UI** (React Dashboard)
   - Sidebar with channel list
   - Main chat area with messages
   - Message composer with file upload
   - Member list sidebar
   - Channel settings modal

3. **Database Schema** (D1)
   - `group_chat_channels` - Channel metadata
   - `group_chat_messages` - Chat messages
   - `group_chat_members` - Channel memberships
   - `group_chat_read_receipts` - Unread message tracking

---

## 🗄️ **DATABASE SCHEMA**

### **Design Principles:**
- ✅ **No foreign key constraints** (avoid blocking)
- ✅ **Simple indexes only** (performance without locking)
- ✅ **Soft deletes** (no data loss)
- ✅ **Minimal joins** (fast queries)

### **Table: `group_chat_channels`**

```sql
CREATE TABLE IF NOT EXISTS group_chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'public', -- public, private, direct
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  archived_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_channels_type ON group_chat_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_archived ON group_chat_channels(is_archived);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON group_chat_channels(created_at);
```

### **Table: `group_chat_messages`**

```sql
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, file, system
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON group_chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON group_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON group_chat_messages(is_deleted);
```

### **Table: `group_chat_members`**

```sql
CREATE TABLE IF NOT EXISTS group_chat_members (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- admin, member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_read_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  left_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_members_channel ON group_chat_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_members_staff ON group_chat_members(staff_id);
CREATE INDEX IF NOT EXISTS idx_members_active ON group_chat_members(is_active);
```

### **Table: `group_chat_read_receipts`**

```sql
CREATE TABLE IF NOT EXISTS group_chat_read_receipts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  last_read_message_id TEXT,
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  unread_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_channel_staff ON group_chat_read_receipts(channel_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_staff ON group_chat_read_receipts(staff_id);
```

---

## 🔌 **API ENDPOINTS**

### **Channels:**
- `GET /api/group-chat/channels` - List all channels (with unread counts)
- `POST /api/group-chat/channels` - Create new channel
- `GET /api/group-chat/channels/:id` - Get channel details
- `PATCH /api/group-chat/channels/:id` - Update channel (name, description)
- `DELETE /api/group-chat/channels/:id` - Archive channel (soft delete)

### **Messages:**
- `GET /api/group-chat/channels/:id/messages` - Get messages (paginated)
- `POST /api/group-chat/channels/:id/messages` - Send message
- `PATCH /api/group-chat/messages/:id` - Edit message
- `DELETE /api/group-chat/messages/:id` - Delete message (soft delete)
- `GET /api/group-chat/channels/:id/poll` - Poll for new messages

### **Members:**
- `GET /api/group-chat/channels/:id/members` - List channel members
- `POST /api/group-chat/channels/:id/members` - Add member
- `DELETE /api/group-chat/channels/:id/members/:staffId` - Remove member
- `PATCH /api/group-chat/channels/:id/members/:staffId` - Update member role

### **Read Receipts:**
- `POST /api/group-chat/channels/:id/read` - Mark channel as read
- `GET /api/group-chat/unread` - Get unread counts for all channels

---

## 🎨 **FRONTEND UI DESIGN**

### **Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Header (existing)                                  │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│ Sidebar  │  Main Chat Area                 │  Members      │
│ (left)   │                                  │  Sidebar      │
│          │  ┌────────────────────────────┐  │  (right)      │
│ Channels │  │ Channel Name               │  │               │
│ List     │  ├────────────────────────────┤  │  👤 John      │
│          │  │                            │  │  👤 Sarah     │
│ # general│  │  Messages                  │  │  👤 Mike      │
│ # support│  │  (scrollable)              │  │               │
│ # sales  │  │                            │  │               │
│          │  │                            │  │               │
│ + New    │  └────────────────────────────┘  │               │
│          │  ┌────────────────────────────┐  │               │
│          │  │ Type message... 📎 [Send]  │  │               │
│          │  └────────────────────────────┘  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

### **Key Features:**

1. **Channel List (Left Sidebar)**
   - Show all channels user is member of
   - Unread badge (red dot with count)
   - Active channel highlighted
   - "+ New Channel" button at bottom
   - Search/filter channels

2. **Main Chat Area (Center)**
   - Channel name at top
   - Scrollable message list
   - Message composer at bottom
   - File attachment button
   - Send button
   - Auto-scroll to bottom on new message

3. **Members Sidebar (Right)**
   - List of channel members
   - Online/offline status
   - Role badges (admin, member)
   - "+ Add Member" button (admins only)

4. **Message Display**
   - Avatar + name + timestamp
   - Message content (markdown support)
   - File attachments (images inline, files as links)
   - Edit/delete buttons (own messages only)
   - "Edited" indicator

---

## 🔄 **REAL-TIME UPDATES**

### **Polling Strategy:**

```javascript
// Poll every 2 seconds when channel is active
setInterval(() => {
  if (activeChannelId && !isTyping) {
    pollForNewMessages(activeChannelId, lastMessageId);
  }
}, 2000);
```

### **Optimizations:**
- Only poll active channel
- Send `lastMessageId` to get only new messages
- Update unread counts for other channels
- Show typing indicator while polling

---

## 📁 **FILE ATTACHMENTS**

### **Integration with R2:**

1. **Upload Flow:**
   - User selects file
   - Convert to base64
   - Send to backend with message
   - Backend uploads to R2 (`group-chat/` prefix)
   - Store R2 URL in `attachment_url`

2. **Display:**
   - Images: Show inline thumbnail (clickable)
   - Files: Show file icon + name (downloadable)
   - Size limit: 10MB (configurable)

3. **R2 Structure:**
   ```
   dartmouth-attachments/
   ├── attachments/          (existing - tickets)
   ├── group-chat/           (new - group chat)
   │   ├── channel-123/
   │   │   ├── uuid-file1.png
   │   │   └── uuid-file2.pdf
   ```

---

## 🔐 **PERMISSIONS & SECURITY**

### **Channel Types:**

1. **Public Channels**
   - All staff can see and join
   - Examples: #general, #announcements

2. **Private Channels**
   - Invite-only
   - Only members can see/access
   - Examples: #management, #sales-team

3. **Direct Messages**
   - 1-on-1 chat between two staff
   - Auto-created when needed

### **Roles:**

1. **Admin**
   - Can edit channel settings
   - Can add/remove members
   - Can delete messages (any)

2. **Member**
   - Can send messages
   - Can edit/delete own messages
   - Can leave channel

### **Access Control:**
- All endpoints require authentication (JWT)
- Check channel membership before allowing access
- Verify role for admin actions

---

## 🧪 **TESTING STRATEGY**

### **Database Testing:**
1. Create channels (public, private, direct)
2. Send messages (text, files)
3. Add/remove members
4. Archive channels
5. **Verify no database blocking** (run concurrent operations)

### **Frontend Testing:**
1. Create channel
2. Send messages
3. Upload files
4. Edit/delete messages
5. Mark as read
6. Check unread counts
7. Poll for new messages

### **Integration Testing:**
1. Multiple users in same channel
2. File attachments display correctly
3. Real-time updates work
4. Permissions enforced
5. No impact on existing features (tickets, live chat)

---

## 🚀 **DEPLOYMENT PLAN**

### **Phase 1: Database (Safe Migration)**
1. Create migration file
2. Test locally with `wrangler d1 execute`
3. Apply to production with `--remote` flag
4. Verify tables created
5. **No rollback needed if tables empty**

### **Phase 2: Backend API**
1. Create controllers
2. Add routes
3. Test endpoints locally
4. Deploy worker with `wrangler deploy`
5. Test production endpoints

### **Phase 3: Frontend UI**
1. Create components
2. Add routes
3. Test locally
4. Build and deploy dashboard
5. Test production UI

### **Phase 4: Integration**
1. Test file attachments
2. Test real-time polling
3. Test permissions
4. Verify no impact on existing features

---

## ⚠️ **LESSONS FROM PREVIOUS FAILURE**

### **What Went Wrong Last Time:**
1. ❌ Foreign key constraints caused database blocking
2. ❌ Complex joins slowed queries
3. ❌ Migration not tested thoroughly
4. ❌ Rushed implementation

### **How We're Fixing It:**
1. ✅ No foreign key constraints
2. ✅ Simple queries, minimal joins
3. ✅ Test migration locally first
4. ✅ Careful, methodical implementation
5. ✅ Verify no impact on existing features at each step

---

## 📊 **SUCCESS CRITERIA**

### **Must Have:**
- ✅ Staff can create channels
- ✅ Staff can send messages
- ✅ Staff can upload files
- ✅ Real-time updates work
- ✅ Unread counts accurate
- ✅ No database blocking
- ✅ No impact on existing features

### **Nice to Have:**
- ⏳ Markdown support in messages
- 🎯 **@mentions (HIGH PRIORITY - See detailed spec below)**
- ⏳ Emoji reactions
- ⏳ Message search
- ⏳ Push notifications

---

## 🎯 **TIMELINE**

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Architecture Planning | 30m | ✅ DONE |
| 2 | Database Schema & Migration | 1h | ⏳ NEXT |
| 3 | Backend API (Channels) | 1h | ⏳ |
| 4 | Backend API (Messages) | 1h | ⏳ |
| 5 | Backend API (Members) | 30m | ⏳ |
| 6 | File Attachments Integration | 1h | ⏳ |
| 7 | Frontend UI (Layout) | 1h | ⏳ |
| 8 | Frontend UI (Channels) | 1h | ⏳ |
| 9 | Frontend UI (Messages) | 1h | ⏳ |
| 10 | Frontend UI (Members) | 30m | ⏳ |
| 11 | Real-time Polling | 1h | ⏳ |
| 12 | Testing & Bug Fixes | 2h | ⏳ |
| 13 | Deployment | 30m | ⏳ |
| 14 | Documentation | 30m | ⏳ |

**Total:** ~13 hours

---

## 📝 **NOTES**

- Keep it simple and focused
- Test at each step
- Don't break existing features
- File attachments must work perfectly
- Real-time updates are critical
- Mobile-friendly (future)

---

**Status:** ✅ **COMPLETE AND DEPLOYED!**

## 🎉 **DEPLOYMENT STATUS**

### ✅ **COMPLETED (December 6, 2025, 2:00 AM AEST)**

- ✅ Architecture planned and documented
- ✅ Database schema designed (no foreign keys)
- ✅ Migration created and applied (local + production)
- ✅ Backend API built (18 endpoints)
- ✅ Frontend UI built (React component)
- ✅ File attachments integrated (R2 storage)
- ✅ Real-time polling implemented
- ✅ Unread counts and notifications
- ✅ Worker deployed to production
- ✅ Dashboard deployed to Cloudflare Pages

### 🌐 **LIVE URLS**

- **Dashboard:** https://dartmouth-os-dashboard.pages.dev/group-chat
- **API:** https://dartmouth-os-worker.dartmouth.workers.dev/api/group-chat/*

### 📊 **DEPLOYMENT STATS**

- **Database Tables:** 4 (group_chat_channels, group_chat_messages, group_chat_members, group_chat_read_receipts)
- **Indexes:** 13 (all non-blocking)
- **API Endpoints:** 18
- **Frontend Components:** 1 main page (GroupChatPage.tsx)
- **Lines of Code:** ~1,500+
- **Build Time:** ~11 seconds
- **Deploy Time:** ~4 seconds

### 🧪 **TESTING CHECKLIST**

- [x] Database migration applied successfully
- [x] Backend API deployed
- [x] Frontend UI deployed
- [ ] Create channel test
- [ ] Send message test
- [ ] File attachment test
- [ ] Real-time polling test
- [ ] Unread counts test
- [ ] No database blocking verified

*Next Step: Manual testing in production*

---

## 🎯 **@MENTIONS SYSTEM - DETAILED SPECIFICATION**

**Added:** December 6, 2025, 8:30 AM AEST  
**Priority:** HIGH  
**Status:** Planning Phase

### **Overview**

The @mentions system enables staff to notify and communicate with specific team members or groups across the platform. Mentions work in Group Chat channels, Ticket Staff Notes, and can trigger AI actions via @mccarthy.

---

### **1. @MENTION TYPES**

#### **A. @all**
- **Purpose:** Notify everyone in the current channel
- **Behavior:** 
  - Sends notification to all channel members
  - Creates mention record for each member
  - Displays with special styling (e.g., highlighted background)
- **Example:** `@all team meeting in 5 minutes`

#### **B. @staffmembername**
- **Purpose:** Notify specific staff member
- **Behavior:**
  - Sends notification to mentioned staff
  - Creates mention record
  - Displays with @ symbol and staff name highlighted
- **Examples:** 
  - `@gaille can you help with this order?`
  - `@john please review TKT-000261`
- **Auto-complete:** Type `@` to show dropdown of staff names

#### **C. @mccarthy (AI Agent)**
- **Purpose:** Give instructions to McCarthy AI
- **Behavior:**
  - AI processes the instruction
  - Executes the requested action
  - Notifies staff when complete
- **Examples:**
  - `@mccarthy please get back to the customer via TKT-000261 and give her the tracking link`
  - `@mccarthy let the customer know their order is ready for collection`
  - `@mccarthy draft an email and notify me when ready for review`
  - `@mccarthy schedule a callback for me with Jane and TKT-000261`

---

### **2. CROSS-SYSTEM MENTIONS**

#### **Ticket Staff Notes → Group Chat**
- **Scenario:** Staff mentions someone in a ticket's Staff Notes
- **Example:** 
  ```
  In Ticket TKT-000261 Staff Notes:
  "@cs @gaille the customers package arrived damaged, can someone organise a reprint please"
  ```
- **Behavior:**
  1. Mention is saved in ticket staff notes
  2. Automatically posted to the **Customer Service** group chat channel
  3. Both @cs (channel) and @gaille (staff) are notified
  4. Message includes ticket context and direct link

#### **Group Chat → Tickets**
- Mentions in group chat can reference tickets
- Clicking ticket reference (e.g., TKT-000261) opens the ticket
- Full context maintained

---

### **3. @MENTIONS PAGE (NEW FEATURE)**

#### **Layout: Dual-Pane Interface**

```
┌────────────────────────────────────────────────────────────────┐
│ @Mentions                                    [Filters ▼]        │
├────────────────────────┬───────────────────────────────────────┤
│ LEFT PANE              │ RIGHT PANE                            │
│ (List of Mentions)     │ (Mention Details)                     │
│                        │                                       │
│ 🔵 @john mentioned you │ ┌─────────────────────────────────┐  │
│    "Can you help..."   │ │ From: John Hutchison            │  │
│    2 hours ago         │ │ Date: Dec 6, 2025 8:30 AM       │  │
│                        │ │ Channel: #customer-service      │  │
│ ⚪ @sarah mentioned you│ │                                 │  │
│    "Please review..."  │ │ Message:                        │  │
│    5 hours ago         │ │ "@gaille can you help with      │  │
│                        │ │ TKT-000261? Customer needs      │  │
│ ⚪ @all in #general    │ │ urgent reprint."                │  │
│    "Team meeting..."   │ │                                 │  │
│    Yesterday           │ │ Related Ticket: TKT-000261      │  │
│                        │ │ [View Ticket →]                 │  │
│ [Load More...]         │ │                                 │  │
│                        │ │ [Mark as Unread] [Go to Chat]   │  │
│                        │ └─────────────────────────────────┘  │
└────────────────────────┴───────────────────────────────────────┘
```

#### **Left Pane: Mentions List**
- **Display (newest first):**
  - 🔵 Blue dot = Unread
  - ⚪ Gray/no dot = Read
  - Staff member who mentioned you
  - Preview of message (first 50 chars)
  - Time ago (e.g., "2 hours ago", "Yesterday")
  
- **Interactions:**
  - Click to view full details in right pane
  - Automatically marks as read when clicked
  - Right-click menu: "Mark as Unread"

#### **Right Pane: Mention Details**
- **Information Displayed:**
  - Staff member who mentioned you (name + avatar)
  - Date and time (full timestamp)
  - Source (channel name or ticket number)
  - Full message content
  - Related ticket info (if applicable):
    - Ticket number
    - Customer name
    - Subject
    - Status
  - Direct link to ticket or channel

- **Actions:**
  - **[Mark as Unread]** - Move back to unread state
  - **[View Ticket →]** - Direct link to ticket (if applicable)
  - **[Go to Chat]** - Jump to the channel/message
  - **[Reply]** - Quick reply in context

#### **Filters (Top Right)**
- **By Channel:**
  - All Channels
  - #customer-service
  - #general
  - #sales
  - etc.

- **By Staff Member:**
  - All Staff
  - John Hutchison
  - Gaille Hutchison
  - Sarah Smith
  - etc.

- **By Time:**
  - Last hour
  - Last 12 hours
  - Last 24 hours
  - Custom date/time range (date picker)

- **By Status:**
  - Unread only
  - Read only
  - All

---

### **4. MCCARTHY AI @MENTION ACTIONS**

#### **Supported Commands:**

1. **Send Message to Customer**
   - `@mccarthy please get back to the customer via TKT-000261 and give her the tracking link`
   - AI fetches tracking info, composes message, sends to customer
   - Notifies staff when complete

2. **Send Email**
   - `@mccarthy send an email to customer@example.com with order confirmation`
   - AI composes and sends email
   - Notifies staff with confirmation

3. **Draft Email for Review**
   - `@mccarthy draft an email response for TKT-000261 and notify me when ready`
   - AI drafts email, saves as draft
   - Sends notification to staff for review

4. **Schedule Callback**
   - `@mccarthy schedule a callback for me with Jane and TKT-000261`
   - AI creates callback task
   - Adds to staff's calendar/task list
   - Notifies staff

5. **Update Customer**
   - `@mccarthy let the customer know their order is ready for collection`
   - AI composes message, sends to customer
   - Updates ticket status

6. **Fetch Information**
   - `@mccarthy get the order status for TKT-000261`
   - AI fetches Shopify data, returns summary
   - Posts in chat for staff to see

#### **AI Response Flow:**
1. Staff mentions @mccarthy with instruction
2. AI parses the command
3. AI executes the action
4. AI posts confirmation/result in chat
5. AI mentions staff when task complete (e.g., `@john I've sent the tracking link to the customer`)

---

### **5. DATABASE SCHEMA ADDITIONS**

#### **New Table: `mentions`**

```sql
CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,              -- ID of message containing mention
  mentioned_staff_id TEXT NOT NULL,      -- Staff member being mentioned
  mentioning_staff_id TEXT NOT NULL,     -- Staff member who mentioned
  mention_type TEXT NOT NULL,            -- 'staff', 'all', 'ai'
  context_type TEXT NOT NULL,            -- 'group_chat', 'ticket_note'
  context_id TEXT NOT NULL,              -- Channel ID or Ticket ID
  is_read INTEGER NOT NULL DEFAULT 0,    -- 0 = unread, 1 = read
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  
  -- For ticket context
  ticket_id TEXT,
  ticket_number TEXT,
  customer_name TEXT,
  
  -- For AI mentions
  ai_action TEXT,                        -- 'send_message', 'draft_email', etc.
  ai_status TEXT,                        -- 'pending', 'processing', 'complete', 'failed'
  ai_result TEXT                         -- Result/response from AI
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_staff ON mentions(mentioned_staff_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioning_staff ON mentions(mentioning_staff_id);
CREATE INDEX IF NOT EXISTS idx_mentions_context ON mentions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_mentions_ticket ON mentions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mentions_ai_status ON mentions(ai_status);
```

#### **Update Existing Tables:**

```sql
-- Add mention_count to group_chat_messages
ALTER TABLE group_chat_messages ADD COLUMN mention_count INTEGER DEFAULT 0;

-- Add has_mentions flag for quick filtering
ALTER TABLE group_chat_messages ADD COLUMN has_mentions INTEGER DEFAULT 0;
```

---

### **6. API ENDPOINTS**

#### **Mentions:**
- `GET /api/mentions` - Get all mentions for current user (with filters)
- `GET /api/mentions/:id` - Get specific mention details
- `POST /api/mentions/:id/read` - Mark mention as read
- `POST /api/mentions/:id/unread` - Mark mention as unread
- `GET /api/mentions/unread-count` - Get total unread mention count
- `GET /api/mentions/stats` - Get mention statistics (by channel, by staff, etc.)

#### **Mention Parsing:**
- `POST /api/mentions/parse` - Parse message for @mentions (used internally)
- Returns array of mentioned staff IDs and types

---

### **7. FRONTEND COMPONENTS**

#### **New Pages:**
1. **`MentionsPage.tsx`** - Main @mentions page with dual-pane layout
2. **`MentionDetailPanel.tsx`** - Right pane component for mention details
3. **`MentionListItem.tsx`** - Individual mention in left pane
4. **`MentionFilters.tsx`** - Filter controls component

#### **New Components:**
1. **`MentionAutocomplete.tsx`** - Dropdown for @mention suggestions
2. **`MentionHighlight.tsx`** - Styled @mention display in messages
3. **`MentionBadge.tsx`** - Unread mention count badge
4. **`MentionNotification.tsx`** - Toast notification for new mentions

#### **Updates to Existing:**
- **`GroupChatPage.tsx`** - Add mention autocomplete to message input
- **`TicketDetailPage.tsx`** - Add mention autocomplete to staff notes
- **`Sidebar.tsx`** - Add @Mentions link with unread badge
- **`DashboardHeader.tsx`** - Add mention notification bell

---

### **8. MENTION PARSING LOGIC**

#### **Frontend (Real-time):**
```javascript
function parseMentions(text) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    
    if (username === 'all') {
      mentions.push({ type: 'all', username: 'all' });
    } else if (username === 'mccarthy') {
      mentions.push({ type: 'ai', username: 'mccarthy' });
    } else {
      // Look up staff by username/first name
      const staff = findStaffByUsername(username);
      if (staff) {
        mentions.push({ type: 'staff', staffId: staff.id, username });
      }
    }
  }
  
  return mentions;
}
```

#### **Backend (Processing):**
1. Parse message for @mentions
2. Validate mentioned staff exist
3. Create mention records in database
4. Send notifications to mentioned staff
5. If @mccarthy, queue AI action
6. If in ticket notes, cross-post to group chat

---

### **9. NOTIFICATION SYSTEM**

#### **Notification Types:**
1. **In-App Badge** - Red dot on @Mentions menu item
2. **Desktop Notification** - Browser notification (if enabled)
3. **Email Digest** - Optional daily/weekly summary
4. **Mobile Push** - Future enhancement

#### **Notification Content:**
- **Title:** "John mentioned you in #customer-service"
- **Body:** Preview of message (first 100 chars)
- **Action:** Click to open @Mentions page

---

### **10. IMPLEMENTATION PHASES**

#### **Phase 1: Basic @mentions in Group Chat (4 hours)**
- Parse @mentions in messages
- Create mentions table
- Display highlighted @mentions
- Basic autocomplete

#### **Phase 2: @Mentions Page (6 hours)**
- Build dual-pane UI
- Implement filters
- Mark as read/unread
- Link to tickets/channels

#### **Phase 3: Cross-System Mentions (4 hours)**
- Ticket notes → Group chat
- Context preservation
- Ticket linking

#### **Phase 4: McCarthy AI Integration (8 hours)**
- Parse @mccarthy commands
- Implement AI actions
- Notification system
- Error handling

#### **Phase 5: Notifications (3 hours)**
- In-app badges
- Desktop notifications
- Email digests

**Total Estimated Time:** 25 hours

---

### **11. SUCCESS CRITERIA**

- ✅ Staff can @mention others in group chat
- ✅ Staff can @mention others in ticket notes
- ✅ @all mentions notify entire channel
- ✅ @Mentions page displays all mentions
- ✅ Filters work correctly
- ✅ Mark as read/unread works
- ✅ Direct links to tickets/channels work
- ✅ @mccarthy executes AI actions
- ✅ Notifications are timely and accurate
- ✅ No performance degradation

---

### **12. FUTURE ENHANCEMENTS**

- **@channel** - Mention all online members only
- **@here** - Mention all active members in channel
- **@team-name** - Mention entire team (e.g., @sales-team)
- **Mention groups** - Create custom mention groups
- **Mute mentions** - Temporarily disable mention notifications
- **Mention analytics** - Track most mentioned staff, busiest channels, etc.

---

**Status:** 📋 **DOCUMENTED - READY FOR IMPLEMENTATION**

