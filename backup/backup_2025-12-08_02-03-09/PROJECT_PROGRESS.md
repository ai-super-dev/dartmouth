# Dartmouth OS - Customer Service System
## Project Progress Tracker

**Last Updated**: December 8, 2025, 12:00 AM AEST  
**Overall Progress**: 99% Complete  
**Status**: ✅ GROUP CHAT & MENTIONS COMPLETE (Phases 1-3) - Production Ready

---

## 🎯 EXECUTIVE SUMMARY

McCarthy AI Dartmouth OS is now a fully functional customer service platform with:
- ✅ **Email Ticket System** - Complete with AI draft responses
- ✅ **Live Chat System** - AI-first with human escalation
- ✅ **AI Agent Integration** - RAG knowledge, system message config, learning
- ✅ **Vector Embeddings RAG** - Semantic search with 53 vectors 🆕
- ✅ **Auto-Assignment** - Smart ticket distribution to staff
- ✅ **Modern Dashboard** - Beautiful UI with all management features

---

## 🎉 DECEMBER 7-8, 2025 - GROUP CHAT & MENTIONS COMPLETE (PHASES 1-3)

### ✅ **MAJOR MILESTONE: Full Group Chat & Mentions System Production-Ready**

**Session Duration:** 12+ hours  
**Features Completed:** 22 major features + 7 bug fixes  
**Status:** ✅ **PRODUCTION READY**

---

### **GROUP CHAT FEATURES COMPLETED:**

#### **Message Management:**
1. ✅ **Edit Messages** - 10-minute window for staff, anytime for admins
2. ✅ **Delete Messages** - 10-minute window for staff, anytime for admins  
3. ✅ **Edit Timestamps** - Always shows date + time (e.g., "edited Dec 7, 12:38 AM")
4. ✅ **Edit/Delete Attachments** - Checkbox to remove attachment when editing
5. ✅ **Permissions System** - Role-based edit/delete (staff 10-min, admin anytime)

#### **Advanced Features:**
6. ✅ **Right-Click Context Menu:**
   - Copy message to clipboard
   - Reply to message (shows preview above input)
   - Share to other channels
7. ✅ **Reply Threading** - Reply preview above input, includes original message reference
8. ✅ **Share with Comments:**
   - Add your own message with mentions
   - Shows who shared it (e.g., "John Hutchison shared from #Customer Support:")
   - Includes attachments from original message
   - Two-step process: Select channel → Add comment
9. ✅ **Ticket Number Links** - `#122` in chat opens ticket in new tab

#### **Attachments:**
10. ✅ **Download Button** - All file types (PDFs, documents, images)
11. ✅ **Image Downloads** - Floating download button (top-right corner)
12. ✅ **Proper Filenames** - Downloads with correct original filename
13. ✅ **Cross-Origin Support** - Works with R2 storage URLs

#### **Profile Pictures:**
14. ✅ **Messages** - Profile pictures in all chat messages
15. ✅ **Members List** - Profile pictures in right sidebar
16. ✅ **Mention Dropdown** - Profile pictures when typing @mentions
17. ✅ **Fallback to Initials** - Shows initials if no picture or image fails

---

### **MENTIONS FEATURES COMPLETED:**

18. ✅ **Attachment Display:**
    - Attachment indicator in mention list (📎 icon + filename)
    - Clicking attachment navigates to Group Chat message
    - Detail view shows attachment info with "Click to view in Group Chat"
    - Backend includes attachment fields in mentions query

19. ✅ **Navigation:**
    - "Go to Chat" button navigates to exact message
    - Message highlighting with yellow background
    - Auto-scroll to highlighted message
    - URL parameters for channel + message ID

20. ✅ **Profile Pictures:**
    - Shows in mention list
    - Shows in detail view
    - Consistent with Group Chat display

21. ✅ **Sorting & Timestamps:**
    - Newest mentions at top
    - Correct local time display
    - ISO 8601 timestamp format

22. ✅ **Platform Icons:**
    - Correct icons for Email, Phone, Chat platforms
    - Consistent with ticket list icons
    - Color-coded (red for phone, indigo for chat, etc.)

---

### **BUG FIXES:**

1. ✅ **Duplicate Message Sending** - Added `isPending` check to prevent duplicates
2. ✅ **Message Polling** - Reduced frequency from 2s to 5s to prevent race conditions
3. ✅ **Avatar Column Name** - Fixed `avatar_url` vs `profile_picture` mismatch
4. ✅ **Attachment Links** - Navigate to message instead of opening file
5. ✅ **Group Chat Mentions** - Fixed SQL JOIN filtering out Group Chat mentions
6. ✅ **Timestamp Format** - Fixed ISO 8601 format for consistent sorting
7. ✅ **Profile Picture URLs** - Added `staffApi.getAvatarUrl()` helper for full URLs

---

### **DEPLOYMENT:**
- ✅ Frontend: https://master.dartmouth-os-dashboard.pages.dev
- ✅ Backend: https://dartmouth-os-worker.dartmouth.workers.dev
- ✅ All features tested and working in production

---

### **FILES MODIFIED:**
- `packages/customer-service-dashboard/src/pages/GroupChatPage.tsx` - 500+ lines added
- `packages/customer-service-dashboard/src/pages/MentionsPage.tsx` - 200+ lines modified
- `packages/worker/src/controllers/group-chat.ts` - Edit/delete logic, profile pictures
- `packages/worker/src/controllers/mentions.ts` - Attachment fields, SQL JOIN fix
- `packages/customer-service-dashboard/src/lib/api.ts` - Updated API calls

---

### **NEXT PRIORITIES:**
1. ⏳ **Mentions: Quick filter pills** (Read/Unread, Shift+Click)
2. ⏳ **Group Chat Settings: Configurable edit/delete timeframe** (Global setting)
3. ⏳ **@Memo feature** (Personal notes with attachments)

---

## Phase Completion

### ✅ Phase 1: Foundation (100% Complete)
- [x] Database schema design
- [x] D1 migrations (35+ migrations applied)
- [x] Core types and interfaces
- [x] Environment setup
- [x] Cloudflare Workers configuration

### ✅ Phase 2: Core Services (100% Complete)
- [x] TicketManager service
- [x] EmailHandler service (V2)
- [x] CustomerServiceAgent integration
- [x] AIAgentProcessor service
- [x] KnowledgeService (RAG + System Message)
- [x] AutoAssignmentService
- [x] AuthenticationService

### ✅ Phase 3: Email Processing (100% Complete)
- [x] Cloudflare Email Routing (inbound)
- [x] Resend API (outbound)
- [x] Email threading (In-Reply-To, References)
- [x] MIME parsing (multipart, base64, quoted-printable)
- [x] Ticket creation from emails
- [x] Priority detection (5 levels)
- [x] Category detection (10+ categories)
- [x] Sentiment analysis (4 levels)
- [x] AI draft response generation
- [x] Scheduled message sending
- [x] Duplicate ticket detection

### ✅ Phase 4: API Development (100% Complete)
- [x] JWT authentication middleware
- [x] Role-based access control (RBAC)
- [x] Auth endpoints (login, logout, me, register)
- [x] Tickets endpoints (CRUD, assign, status, reply, notes, snooze, merge, bulk)
- [x] Chat endpoints (conversations, messages, takeover, pickup, close, reassign)
- [x] Staff endpoints (list, get, update presence, availability)
- [x] AI Agent endpoints (knowledge, system-message, widget-settings, embed-code)
- [x] Auto-Assignment endpoints (config, run, history, staff settings)
- [x] Business Hours endpoints
- [x] Analytics endpoints
- [x] Settings endpoints

### ✅ Phase 5: Frontend Dashboard (98% Complete)
- [x] React + Vite + TypeScript setup
- [x] Tailwind CSS + Custom styling
- [x] Authentication flow (login, logout, session)
- [x] Dashboard layout (sidebar, header, profile menu)
- [x] Tickets list page (filters, search, bulk actions)
- [x] Ticket detail page (messages, notes, AI draft panel)
- [x] Chat dashboard page (4 tabs, staff filter)
- [x] Chat ticket detail page
- [x] AI Agent settings pages (knowledge, system message, widget)
- [x] Business hours configuration
- [x] Auto-assignment settings
- [x] Staff management page
- [x] Analytics dashboard
- [x] Settings hub page
- [x] My Account page
- [ ] Mobile responsiveness (partial)

### ✅ Phase 6: Live Chat System (100% Complete)
- [x] Chat widget package (standalone)
- [x] Widget customization (colors, text, position)
- [x] Pre-chat form (name, email)
- [x] Real-time messaging (polling)
- [x] AI-first handling
- [x] Human escalation detection
- [x] Staff takeover/pickup flow
- [x] Chat reassignment
- [x] Conversation close with resolution types
- [x] File attachments (backend)
- [x] Embed code generator
- [x] Business hours display
- [x] Online/offline indicator

### ✅ Phase 7: AI Agent Integration (100% Complete)
- [x] AI Agent as staff member
- [x] AI draft response generation
- [x] Confidence scoring
- [x] Auto-escalation logic
- [x] RAG knowledge base
- [x] System message configuration
- [x] Learning examples injection
- [x] RLHF data collection
- [x] Quality scoring (1-5 stars)
- [x] Approve/Edit/Reject workflow
- [x] AI Analytics dashboard
- [x] **Vector Embeddings RAG** (53 vectors, Cloudflare Vectorize) 🆕

### ✅ Phase 8: Advanced Features (85% Complete)
- [x] Scheduled replies
- [x] Ticket snooze (30m, 1h, 4h, tomorrow, next week)
- [x] Ticket merging
- [x] Bulk reassignment
- [x] Bulk delete
- [x] Soft delete
- [x] Duplicate detection
- [x] Email auto-assignment
- [x] **Vector Embeddings for RAG** - ✅ **COMPLETE** 🆕
- [x] **Callback feature (form-based)** - ✅ **COMPLETE** 🆕
- [ ] Post-chat survey - Pending
- [ ] Typing indicators - Pending

### ⬜ Phase 9: Production Deployment (70% Complete)
- [x] Worker deployed to Cloudflare
- [x] Dashboard deployed to Cloudflare Pages
- [x] Environment configuration
- [x] Production secrets setup
- [ ] Custom domain configuration
- [ ] SSL/TLS setup (Cloudflare handles)
- [ ] Monitoring and logging
- [ ] Performance optimization

---

## Feature Status

### Email System
| Feature | Status | Notes |
|---------|--------|-------|
| Cloudflare Email Routing | ✅ Working | Inbound email processing |
| Resend API | ✅ Working | Outbound email sending |
| Email threading | ✅ Working | In-Reply-To, References headers |
| MIME parsing | ✅ Working | Multipart, base64, quoted-printable |
| Ticket creation | ✅ Working | Auto-generated TKT-XXXXXX numbers |
| Priority detection | ✅ Working | Low, normal, high, urgent, critical |
| Category detection | ✅ Working | Order status, artwork, payment, etc. |
| Sentiment analysis | ✅ Working | Positive, neutral, negative, angry |
| AI draft responses | ✅ Working | Auto-generated with confidence scores |
| Scheduled messages | ✅ Working | Cron job sends at scheduled time |
| Duplicate detection | ✅ Working | Auto-archive within 5 mins |
| Paragraph spacing | ✅ Working | Preserved in all views |

### Live Chat System
| Feature | Status | Notes |
|---------|--------|-------|
| Chat widget | ✅ Working | Embeddable JavaScript |
| Pre-chat form | ✅ Working | Name & email collection |
| AI-first handling | ✅ Working | All chats start with AI |
| Human escalation | ✅ Working | Specific keyword detection |
| Staff takeover | ✅ Working | Take over from AI |
| Staff pickup | ✅ Working | Pick up from queue |
| Chat reassignment | ✅ Working | Reassign to staff or AI |
| Conversation close | ✅ Working | With resolution types |
| RAG integration | ✅ Working | Uses knowledge documents |
| Priority/Sentiment | ✅ Working | AI analyzes chat messages |
| File attachments | 🚧 Backend Only | UI pending |
| Typing indicator | ⬜ Not Started | Planned |
| Callback feature | ✅ Working | Multi-step flow with form & email |

### AI Agent
| Feature | Status | Notes |
|---------|--------|-------|
| AI staff member | ✅ Working | McCarthy AI (ai-agent-001) |
| Draft generation | ✅ Working | For all new tickets |
| Confidence scoring | ✅ Working | 0-1 scale |
| Auto-escalation | ✅ Working | Low confidence → human |
| RAG knowledge | ✅ Working | 12 documents uploaded |
| System message | ✅ Working | Configurable personality |
| Learning examples | ✅ Working | Top 5 high-quality responses |
| RLHF collection | ✅ Working | Quality, helpful, notes |
| Analytics dashboard | ✅ Working | Stats, charts, tables |
| Stronger RAG usage | ✅ Working | Prioritizes knowledge docs |

### Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Login/Auth | ✅ Working | JWT with refresh |
| Tickets list | ✅ Working | Filters, search, bulk actions |
| Ticket detail | ✅ Working | Messages, notes, AI panel |
| Chat dashboard | ✅ Working | 4 tabs, staff filter |
| Chat ticket detail | ✅ Working | Dedicated page |
| AI settings | ✅ Working | Knowledge, system message, widget |
| Business hours | ✅ Working | Day-by-day config |
| Auto-assignment | ✅ Working | Config and history |
| Staff management | ✅ Working | List, add, edit |
| Analytics | ✅ Working | AI performance metrics |
| Settings hub | ✅ Working | Central settings page |
| My Account | ✅ Working | Staff profile editing |
| Profile menu | ✅ Working | Status toggle, logout |
| Collapsible sidebar | ✅ Working | Default collapsed |
| Mobile responsive | 🚧 Partial | Desktop works, mobile needs work |

### Database
| Feature | Status | Notes |
|---------|--------|-------|
| Schema | ✅ Complete | 20+ tables |
| Migrations | ✅ Working | 35+ migrations applied |
| Indexes | ✅ Complete | All foreign keys indexed |
| Seeding | ✅ Complete | Staff users and settings |

---

## Metrics

### Code Statistics
- **Backend Files**: 50+
- **Frontend Files**: 40+
- **Total Lines of Code**: ~15,000+
- **API Endpoints**: 50+
- **Database Tables**: 20+
- **Migrations**: 35+

### System Statistics
- **Tickets Created**: 180+ (and counting)
- **Chat Conversations**: 20+
- **Staff Users**: 5 (including AI)
- **RAG Documents**: 12
- **System Settings**: 20+

### Performance
- **API Response Time**: <100ms (average)
- **AI Draft Generation**: ~2-3 seconds
- **Dashboard Load Time**: <1 second
- **Chat Response Time**: ~1-2 seconds

---

## Recent Achievements

### December 7, 2025 (11:15 AM) - MENTIONS PAGE UI OVERHAUL & GROUP CHAT ENHANCEMENTS! 🎨

**MENTIONS PAGE - COMPLETE REDESIGN:**
- ✅ **Pill-based layout** - Modern pill design for all metadata
  - #Channel pill (indigo) - Shows group chat channel or ticket number
  - @Mention by {Name} pill (soft orange) - Shows who mentioned you
  - Date/Time pill (slate grey) - Full date/time format
  - Read/Unread pill (blue/emerald) - Clear status indicator
- ✅ **Two-row header layout** - Pills on top row, buttons on bottom row
- ✅ **List view redesign** - Same pill layout in left column
- ✅ **Visual status indicators** - Blue background for unread, grey for read
- ✅ **Selected mention highlighting** - Border shows which mention is selected
- ✅ **No spacing issues** - Columns perfectly aligned with no gaps
- ✅ **@ticket links** - Open in new tab with auto-search and auto-navigate
- ✅ **"Go to Chat" feature** - Navigates to exact message with yellow highlight
- ✅ **Auto-scroll** - Scrolls to highlighted message in group chat
- ✅ **Timed highlight** - Yellow highlight fades after 5 seconds

**GROUP CHAT ENHANCEMENTS:**
- ✅ **Selected channel highlighting** - Indigo background + border for active channel
- ✅ **Message highlighting** - Yellow background for linked messages from mentions
- ✅ **Auto-scroll to message** - Smooth scroll to center highlighted message
- ✅ **Date formatting** - Full date/time for old messages, time only for today
- ✅ **@ticket links** - Clickable ticket references that open in new tab

**TICKET SEARCH IMPROVEMENTS:**
- ✅ **Auto-navigate** - Single search result auto-opens ticket detail page
- ✅ **Multiple format support** - Works with "254", "TKT-254", "TKT-000254"
- ✅ **URL parameter handling** - Populates search from URL query string
- ✅ **Smart matching** - Strips leading zeros and TKT- prefix for matching

**FILES MODIFIED:**
- `packages/customer-service-dashboard/src/pages/MentionsPage.tsx` - Complete UI redesign
- `packages/customer-service-dashboard/src/pages/GroupChatPage.tsx` - Message highlighting + channel selection
- `packages/customer-service-dashboard/src/pages/TicketsPage.tsx` - Auto-navigate + search improvements

**DEPLOYMENT:**
- ✅ Dashboard deployed: https://master.dartmouth-os-dashboard.pages.dev
- ✅ All features tested and working in production

### December 6, 2025 (2:00 AM) - GROUP CHAT SYSTEM COMPLETE! 💬
- ✅ **GROUP CHAT ARCHITECTURE**: Comprehensive planning document created
  - Designed database schema with NO foreign keys (no blocking issues)
  - 4 tables: channels, messages, members, read_receipts
  - 13 indexes for performance (all non-blocking)
  - Planned 18 API endpoints
  
- ✅ **DATABASE MIGRATION**: Successfully deployed to production
  - Created and tested locally first
  - Applied to production database (18 queries executed)
  - No foreign key constraints (learned from previous rollback)
  - Seed data: #general channel created automatically
  
- ✅ **BACKEND API**: Complete group chat controller
  - Channels: list, create, get, update, archive
  - Messages: get, send, poll, edit, delete
  - Members: get, add, remove
  - Read receipts: mark as read, get unread counts
  - File attachments: integrated with R2 storage
  - Real-time polling: 2-second intervals
  
- ✅ **FRONTEND UI**: Beautiful React component
  - 3-column layout: channels, messages, members
  - Real-time message updates (polling)
  - File attachment support (images inline, files as links)
  - Unread message badges
  - Create channel modal
  - Member list with online status
  - Message composer with Enter to send
  - Auto-scroll to latest message
  
- ✅ **DEPLOYED TO PRODUCTION**:
  - Worker deployed: https://dartmouth-os-worker.dartmouth.workers.dev
  - Dashboard deployed: https://dartmouth-os-dashboard.pages.dev/group-chat
  - Build time: ~11 seconds
  - Deploy time: ~4 seconds
  - Total development time: ~2 hours

### December 5, 2025 (2:30 PM) - SHOPIFY ENHANCEMENTS COMPLETE! 🛍️
- ✅ **SHOPIFY ORDER NAVIGATION**: Added left/right arrows to browse through all orders
  - Shows "ORDER 1 OF 21" with navigation controls
  - Arrows only appear when multiple orders exist
  - Resets to order 1 when switching tickets/conversations
  - Removed old "Order History" list in favor of navigation
  - Increased order limit from 5 to 100 orders per customer
  
- ✅ **CLICKABLE PRODUCT ITEMS**: Products now expand to show full metadata
  - Click any product to expand/collapse details
  - Shows: Price, SKU, Variant, and ALL custom attributes
  - Smooth expand/collapse animation with chevron icon
  - Displays all Shopify custom properties (_previewLink, _dpi, _canvasSize, etc.)
  
- ✅ **PRODUCT METADATA DISPLAY**: All custom attributes now visible
  - Added `customAttributes` to Shopify GraphQL queries
  - Backend fetches all custom product properties
  - Links are clickable (previewLink, cartEditLink, portalEditLink, jsonFileLink)
  - Technical data shown in monospace font (IDs, dimensions, DPI)
  - Clean formatting with proper labels and truncation
  
- ✅ **MESSAGE ORDER FIX**: Ticket messages now show newest first
  - Reversed message order in TicketDetailPage
  - Most recent message appears at top of viewing window
  - Easier to see latest updates without scrolling
  
- ✅ **LIVE CHAT SHOPIFY SYNC**: All chat pages now match main ticket format
  - ChatDashboardPage updated with same Shopify display
  - ChatTicketDetailPage updated with same Shopify display
  - Consistent customer info, order details, and tracking across all views

### December 6, 2025 (12:30 AM) - CALLBACK FEATURE COMPLETE! 🎉
- ✅ **CALLBACK FEATURE COMPLETE**: Multi-step form-based callback flow
  - AI detects "callback" keyword and initiates flow
  - Displays 2 messages with typing indicators (bouncing dots)
  - Shows callback form with all required fields
  - Creates ticket with "callback_request" category
  - Sends confirmation email to customer via Resend API
  - Closes chat conversation automatically
  - Fixed multiple issues: form repeating, disappearing, non-editable fields
  - Fixed email sending (bypassed ResendService, used Resend API directly)
  - Fixed chat history formatting for staff view
  - Hidden internal system messages from chat display

### December 5, 2025 - LATE NIGHT SESSION
- ✅ **CRITICAL FIX**: Fixed 500 error on chat poll endpoint (AI messages now reach widget)
- ✅ **SHOPIFY INTEGRATION**: Complete backend + frontend integration
- ✅ Rolled back Group Chat system (caused database blocking)
- ✅ Started file attachment onClick handlers (3/4 pages done)
- ✅ Created comprehensive SESSION_HANDOVER document
- ✅ Fixed ticket filtering to allow all filters to combine
- ✅ Fixed navigation arrows in chat dashboard
- ✅ Fixed ticket number display (TKT-XXXXXX format)
- ✅ Fixed AI assignment for chat tickets
- ✅ Added dynamic staff list in sidebar
- ✅ Added staff-specific ticket counts
- ✅ Improved escalation keywords (less false positives)
- ✅ Added stronger RAG instructions to AI prompt
- ✅ Fixed chat dashboard header alignment
- ✅ Added staff filter dropdown to chat dashboard
- ✅ Removed McCarthy AI from staff filter
- ✅ Changed "Staff Live" to "Staff" in tabs
- ✅ Fixed assigned staff name display
- ✅ Updated all documentation

### December 4, 2025
- ✅ Built complete Live Chat System
- ✅ Built Chat Widget package
- ✅ Built Chat Dashboard with 4 tabs
- ✅ Built Chat Ticket Detail page
- ✅ Implemented AI-first chat handling
- ✅ Implemented human escalation detection
- ✅ Built RAG Knowledge UI
- ✅ Built System Message Configuration UI
- ✅ Built Email Auto-Assignment System
- ✅ Built Navigation & UI Overhaul
- ✅ Built Staff Profile & Account System

### December 3, 2025
- ✅ Built AI Agent Analytics Dashboard
- ✅ Implemented RLHF data collection
- ✅ Built scheduled replies feature
- ✅ Built ticket merging feature
- ✅ Built bulk operations
- ✅ Built snooze functionality (30m option)
- ✅ Built duplicate ticket detection

### December 2, 2025
- ✅ Completed AI Agent Integration
- ✅ Built AIAgentProcessor service
- ✅ Built KnowledgeService
- ✅ Built AI Draft Response Panel
- ✅ Integrated CustomerServiceAgent

---

## Known Issues

### 🔴 Critical - SECURITY
1. **PASSWORD SECURITY - MUST FIX BEFORE PRODUCTION** ⚠️
   - **Issue**: Plain text password comparison in authentication
   - **Location**: `packages/worker/src/controllers/auth.ts` lines 12-16
   - **Risk**: HIGH - All staff passwords stored/compared as plain text
   - **Fix Required**: Implement bcrypt/argon2 hashing with Web Crypto API
   - **Impact**: All staff accounts need password reset after fix
   - **Current Workaround**: Password must match `password_hash` field exactly

### High Priority
1. **Mobile Responsiveness**: Dashboard needs mobile optimization
2. **Mentions Mark as Read**: Admins can't mark other staff's mentions (security by design, may want to allow)

### Medium Priority
1. **Typing Indicators**: Not implemented for regular chat messages
2. **Post-Chat Survey**: Not implemented
3. **Mentions Notifications**: No push/email notifications when mentioned

### Low Priority
1. **File Attachments UI**: Backend done, UI pending
2. ✅ ~~**Group Chat**~~ - COMPLETE! Internal team chat with file attachments
3. ✅ ~~**Shopify Integration**~~ - COMPLETE! (Connected, order navigation, product metadata)

---

## Next Milestones

### Immediate (Next Session)
1. ✅ ~~Implement Callback Feature (form-based flow)~~ - COMPLETE!
2. Post-chat survey
3. Typing indicators for chat

### Short Term (1-2 weeks)
1. Post-chat survey
2. Typing indicators
3. Mobile responsiveness
4. File attachments UI (chat)

### Medium Term (1 month)
1. ✅ ~~Shopify integration~~ - COMPLETE!
2. Shopify product display configuration page
3. Group chat system
4. Advanced analytics
5. Performance optimization

### Long Term (2-3 months)
1. WhatsApp integration
2. Instagram DM integration
3. Multi-tenant SaaS
4. Mobile app

---

## 📋 TODO List (Current Session)

### ✅ Completed (1)
1. ✅ **Main tickets - newest message first** - DONE (deployed Dec 5)

### 🔴 High Priority - UX Issues (5)
2. ⏳ **Left menu navigation** - Stop page jumping/scrolling on link clicks
3. ⏳ **Live chat callback text** - Replace `__SHOW_CALLBACK_FORM__` with "CALL BACK REQUEST"
4. ⏳ **AI Handling label** - Change to "McCarthy AI" in Live Chat
5. ⏳ **Attachments fix** - Not working correctly in ticket/livechat/widget
6. ⏳ **Live chat default view** - Default to newest ticket and show chat messages on open

### 🟡 Medium Priority - Icons/Consistency (4)
7. ⏳ **Platform dropdown icons** - Make all consistent (currently inconsistent)
8. ⏳ **Phone icon fix** - Green on main ticket/queue for callbacks (should be red)
9. ⏳ **Email icon** - Use envelope consistently everywhere
10. ⏳ **Live chat icon** - Use same icon consistently everywhere

### 🟢 Low Priority - Shopify Enhancements (3)
11. ⏳ **Shopify data formatting** - Reformat preview/edit links display
12. ⏳ **Shopify URL shortener** - Add URL shortener + hyperlinks for response area
13. ⏳ **Shopify config page** - Create UI to configure what to show/hide and formatting

---

## 🎯 FUTURE FEATURES - @MENTIONS SYSTEM (Documented Dec 6, 2025)

### **Phase 1: Basic @mentions in Group Chat** (4 hours)
- ⏳ Parse @mentions in messages (`@all`, `@staffname`)
- ⏳ Create `mentions` database table
- ⏳ Display highlighted @mentions in messages
- ⏳ Basic autocomplete dropdown when typing `@`

### **Phase 2: @Mentions Page** (6 hours)
- ⏳ Build dual-pane UI (list + details)
- ⏳ Implement filters (channel, staff, time, status)
- ⏳ Mark as read/unread functionality
- ⏳ Link to tickets/channels from mentions

### **Phase 3: Cross-System Mentions** (4 hours)
- ⏳ Ticket Staff Notes → Group chat auto-posting
- ⏳ Context preservation (ticket info, customer name)
- ⏳ Direct ticket linking from mentions

### **Phase 4: McCarthy AI Integration** (8 hours)
- ⏳ Parse `@mccarthy` commands
- ⏳ Implement AI actions:
  - Send message to customer via ticket
  - Draft email for review
  - Schedule callback
  - Update customer on order status
  - Fetch Shopify data
- ⏳ Notification system when AI completes tasks
- ⏳ Error handling and fallbacks

### **Phase 5: Notifications** (3 hours)
- ⏳ In-app badges (unread count)
- ⏳ Desktop notifications
- ⏳ Email digests (optional)

**Total Estimated Time:** 25 hours  
**Status:** 📋 Fully documented, ready for implementation  
**Documentation:** See `GROUP_CHAT_ARCHITECTURE.md` for complete specification

---

## Resources

### 📂 Project Directories

| Location | Path | Description |
|----------|------|-------------|
| **Main Project** | `D:\coding\DARTMOUTH_OS_PROJECT\` | Working codebase |
| **Backups** | `D:\coding\BACKUPS\` | Full project backups |
| **RAG Documents** | `D:\coding\Customer Service AI Agent\RAG_Documents\` | Source knowledge documents |

### 💾 Latest Backups

| Backup | Date | Time |
|--------|------|------|
| **DARTMOUTH_OS_BACKUP_2025-12-07_11-51-05** | Dec 7, 2025 | 11:51 AM AEST |
| `DARTMOUTH_OS_PROJECT_2025-12-05_1430` | Dec 5, 2025 | 2:30 PM AEST |
| `DARTMOUTH_OS_2025-12-05_092318` | Dec 5, 2025 | 9:23 AM |
| `DARTMOUTH_OS_2025-12-05_085548` | Dec 5, 2025 | 8:55 AM |

### 🌐 GitHub Repository

| Item | Value |
|------|-------|
| **Repository** | `https://github.com/hutchisonjohn/dartmouth.git` |
| **Branch** | `master` |
| **Latest Commit** | `36529f0` - Mentions & Group Chat UI Overhaul |

### 📄 Documentation Files

| Document | Path |
|----------|------|
| **🔴 SESSION HANDOVER** | `SESSION_HANDOVER_DEC_5_2025.md` ← **START HERE AFTER REBOOT** |
| **Architecture Doc** | `McCarthy AI Dartmouth OS 2-12-25/NEW_FEATURES_BEYOND_ORIGINAL_ARCHITECTURE.md` |
| **API Architecture** | `McCarthy AI Dartmouth OS 2-12-25/MASTER_API_ARCHITECTURE.md` |
| **Build Plan** | `MASTER_BUILD_PLAN_DEC_2_2025.md` |
| **Progress Doc** | `PROJECT_PROGRESS.md` (this file) |
| **Testing Guide** | `TESTING_GUIDE.md` |
| **RAG Test Results** | `packages/worker/scripts/RAG_TEST_RESULTS.md` |
| **RAG Test Script** | `packages/worker/scripts/test-vector-rag.ps1` |

### 🧪 Vector RAG Test Results (Dec 5, 2025)

| Category | Tests | Result |
|----------|-------|--------|
| DTF Transfers | 5 | ✅ 5/5 PASS |
| UV DTF | 3 | ✅ 3/3 PASS |
| Shipping | 2 | ✅ 2/2 PASS |
| Returns | 2 | ✅ 2/2 PASS |
| Terms | 2 | ✅ 2/2 PASS |
| Ordering | 3 | ✅ 3/3 PASS |
| FAQ | 3 | ✅ 3/3 PASS |
| **TOTAL** | **20** | **100% PASS** ✅ |

**Key Verification:** AI now correctly answers "What temperature for DTF?" with **150-160°C** (from RAG docs) instead of generic **160-170°C**.

### 🚀 Deployment URLs

| Service | URL |
|---------|-----|
| **Worker API** | https://dartmouth-os-worker.dartmouth.workers.dev |
| **Dashboard** | https://dartmouth-os-dashboard.pages.dev |
| **Chat Widget (Local)** | http://localhost:5173/ |
| **Database** | dartmouth-os-db (Cloudflare D1) |
| **Vectorize Index** | dartmouth-rag (53 vectors) |

### 🧪 Local Development

#### Starting Chat Widget Server
```powershell
cd D:\coding\DARTMOUTH_OS_PROJECT\packages\chat-widget
npm run dev
```
Then open: http://localhost:5173/

### 🔐 Credentials
- Admin: john@directtofilm.com.au

---

**Status**: ✅ ON TRACK  
**Morale**: 🚀 HIGH  
**Next Session**: Complete file attachment fixes, then callback feature

---

## 🔄 AFTER PC REBOOT - START HERE

1. **Open Project:** `D:\coding\DARTMOUTH_OS_PROJECT\`
2. **Read First:** `SESSION_HANDOVER_DEC_5_2025.md` ← Complete handover document
3. **Then Read:** `PROJECT_PROGRESS.md` (this file)
4. **Start Chat Widget:** `cd packages\chat-widget && npm run dev`
5. **Tell AI:** "Continue with file attachment fixes from SESSION_HANDOVER_DEC_5_2025.md"

---

---

## December 6, 2025 (10:50 PM AEST) - MENTIONS MARK AS READ/UNREAD FIXED! ⚠️

### **Bug Fixes & Security Issues**

**✅ Mentions Mark as Read/Unread - FIXED:**
- Fixed optimistic update using wrong queryKey (wasn't including filter parameters)
- Removed auto-mark-as-read behavior when clicking mentions in list
- Both left column (list) and right column (detail) now update correctly
- Changes persist after page refresh (when marking own mentions)
- Issue: Admins viewing "All Mentions" can't mark other staff's mentions as read (security restriction)

**⚠️ CRITICAL SECURITY ISSUE IDENTIFIED:**
- **Password Storage:** Currently using PLAIN TEXT password comparison
- **Location:** `packages/worker/src/controllers/auth.ts` line 12-16
- **Risk:** HIGH - Passwords stored as plain text in database
- **Impact:** All staff accounts vulnerable
- **Fix Required:** Implement proper bcrypt/argon2 hashing
- **Temporary Workaround:** Password must match `password_hash` field exactly
- **Status:** ⚠️ MUST FIX BEFORE PRODUCTION

**Files Modified:**
- `packages/customer-service-dashboard/src/pages/MentionsPage.tsx` - Fixed queryKey in mutations

**Deployment:**
- ✅ Dashboard deployed: https://master.dartmouth-os-dashboard.pages.dev

**Testing Notes:**
- Tested as admin viewing all mentions (can't mark others' mentions)
- Need to test as regular user (Gaille) to verify full functionality
- Gaille's test password: `test123`

---

## December 6, 2025 (8:30 AM AEST) - @MENTIONS SYSTEM DOCUMENTED! 🎯

### **Major Planning Session**

**@Mentions System Specification Complete:**
- ✅ Comprehensive architecture documented in `GROUP_CHAT_ARCHITECTURE.md`
- ✅ Three mention types defined: `@all`, `@staffmembername`, `@mccarthy`
- ✅ Cross-system mentions (Ticket Notes → Group Chat)
- ✅ Dual-pane @Mentions page designed
- ✅ McCarthy AI integration planned (send messages, draft emails, schedule callbacks)
- ✅ Database schema designed (`mentions` table)
- ✅ API endpoints specified
- ✅ Frontend components planned
- ✅ Notification system designed
- ✅ 5-phase implementation plan (25 hours estimated)

**Key Features:**
1. **@all** - Notify everyone in channel
2. **@gaille** - Notify specific staff member
3. **@mccarthy** - AI agent instructions
4. **Ticket Staff Notes** - Mentions auto-post to group chat
5. **@Mentions Page** - Dual-pane interface with filters
6. **Smart Filtering** - By channel, staff, time, status
7. **AI Actions** - McCarthy can send messages, draft emails, schedule callbacks

**Example Use Cases:**
- `@cs @gaille the customers package arrived damaged, can someone organise a reprint please`
- `@mccarthy please get back to the customer via TKT-000261 and give her the tracking link`
- `@mccarthy draft an email and notify me when ready for review`
- `@mccarthy schedule a callback for me with Jane and TKT-000261`

**Status:** 📋 Fully documented and ready for implementation

---

## December 7, 2025 (10:40 PM AEST) - ✅ GROUP CHAT MENTIONS FULLY FIXED! 🎉

### **Critical Bug Resolution - Two Issues Fixed**

**Issue #1: Group Chat Mentions Not Appearing**

**Problem:**
- Group Chat mentions were being created in database but NOT appearing on Mentions page
- SQL query was returning ONLY `context_type = 'ticket_note'` mentions
- ZERO `context_type = 'group_chat'` mentions in query results

**Root Cause:**
- SQL JOIN had incorrect condition: `LEFT JOIN tickets t ON m.context_type = 'ticket_note' AND m.ticket_id = t.ticket_id`
- The `m.context_type = 'ticket_note'` filter was excluding all Group Chat mentions

**Fix #1:**
- Changed to: `LEFT JOIN tickets t ON m.ticket_id = t.ticket_id`
- Deployed: Version 027f2ced-a06e-46fe-93e6-9d157d99e057 (11:51 AM)

---

**Issue #2: Wrong Timestamps and Broken Sorting**

**Problem:**
- Group Chat mentions showed wrong time (12:26 PM instead of 10:26 PM)
- New mentions NOT appearing at top of list (sorting broken)
- Database timestamps: `2025-12-07 12:26:20` (no timezone) vs `2025-12-07T09:32:56.217Z` (ISO format)

**Root Cause:**
- `createMentions` function NOT setting `created_at` field explicitly
- SQLite `CURRENT_TIMESTAMP` default returns `YYYY-MM-DD HH:MM:SS` format (no timezone)
- Need ISO 8601 format with timezone for proper sorting and display

**Fix #2:**
- Added `created_at` field to all INSERT statements in `createMentions`
- Set to `new Date().toISOString()` for proper ISO 8601 format
- Applied to all mention types: `@all`, `@staff`, `@ai`
- Deployed: Version c78b76d9-a3ee-4f63-bb09-35ba90d2fc6c (10:34 PM)

---

**Testing Results:**
- ✅ Group Chat mentions now appear on Mentions page
- ✅ Timestamps display correctly in local timezone (10:34 PM)
- ✅ Sorting works properly (newest at top)
- ✅ Works for all staff members (John, Gaille tested)
- ✅ Ticket Staff Notes mentions still working correctly
- ✅ All platform icons displaying correctly (Email, Phone, Chat)
- ✅ Self-mentions working for all staff

**Files Modified:**
- `packages/worker/src/controllers/mentions.ts` (lines 129, 502-520, 538-556, 561-580)
  - Fixed SQL JOIN condition
  - Added explicit `created_at` with ISO 8601 timestamp to all INSERT statements

**Deployment:**
- ✅ Backend deployed: https://dartmouth-os-worker.dartmouth.workers.dev
- ✅ Version ID: c78b76d9-a3ee-4f63-bb09-35ba90d2fc6c

**Status:** ✅ FULLY RESOLVED - All mentions working perfectly!

---

## December 7, 2025 (11:55 AM AEST) - 🔴 CRITICAL BUG DISCOVERED: Group Chat Mentions Not Appearing

### **Issue Discovered**

**Problem:**
- Group Chat mentions are being created successfully in the database (confirmed via logs)
- Backend logs show: `[Group Chat] Mentions created successfully`
- BUT mentions are NOT appearing on the Mentions page
- Only Ticket Staff Notes mentions are showing up

**What Works:**
- ✅ Ticket Staff Notes mentions (Email, Phone, Chat platforms)
- ✅ Self-mentions for all staff (John, Gaille, etc.)
- ✅ @all mentions in both Group Chat and Ticket Staff Notes
- ✅ Mention parsing and database insertion

**What's Broken:**
- ❌ Group Chat mentions not appearing in Mentions page query results
- ❌ Query returns 14 mentions but ALL are `context_type = 'ticket_note'`
- ❌ ZERO `context_type = 'group_chat'` mentions in results

**Root Cause Identified:**
- SQL JOIN condition in `getMentions` query was filtering out Group Chat mentions
- Line 129: `LEFT JOIN tickets t ON m.context_type = 'ticket_note' AND m.ticket_id = t.ticket_id`
- The `m.context_type = 'ticket_note'` condition in the JOIN was excluding Group Chat rows

**Fix Applied:**
- Changed to: `LEFT JOIN tickets t ON m.ticket_id = t.ticket_id`
- Deployed to production (Version ID: 027f2ced-a06e-46fe-93e6-9d157d99e057)

**Status:** 🔴 IDENTIFIED - Fix deployed, awaiting verification

**Files Modified:**
- `packages/worker/src/controllers/mentions.ts` - Fixed SQL JOIN condition (line 129)

**Logs Location:**
- Terminal 17: `c:\Users\johnp\.cursor\projects\d-coding-DARTMOUTH-OS-PROJECT\terminals\17.txt`

---

## 📋 COMPREHENSIVE TODO LIST (December 8, 2025)

### **🎯 IMMEDIATE PRIORITIES (Next Session):**

#### **1. Mentions - Quick Filter Pills** ⭐ **START HERE**
**Priority:** HIGH  
**Estimated Time:** 2-3 hours  
**Location:** `packages/customer-service-dashboard/src/pages/MentionsPage.tsx`

**Features:**
- Read/Unread filter pills (opposite "Filter >" button)
- Shift+Click to multi-select mentions
- Clicking pill changes status (Read ↔ Unread)
- Show count (e.g., "Unread (5)")
- Batch API update for multiple mentions

---

#### **2. Group Chat Settings - Configurable Edit/Delete Timeframe**
**Priority:** HIGH  
**Estimated Time:** 3-4 hours  
**Location:** `packages/customer-service-dashboard/src/pages/GroupChatSettingsPage.tsx`

**Features:**
- **GLOBAL setting** for all channels (not per-channel)
- Options: 5 min, 10 min, 15 min, 30 min, 1 hour, No limit
- Store in KV namespace: `group_chat_edit_delete_time_limit`
- Admin-only setting
- Default: 10 minutes

**Backend Changes:**
- API endpoint to get/set global setting
- Update `editMessage` and `deleteMessage` to check global setting
- Store in KV: `await env.APP_CONFIG.put('group_chat_edit_delete_time_limit', value)`

**Frontend Changes:**
- Dropdown in Group Chat Settings
- Fetch global setting on app load
- Update `canEditOrDelete` helper function

---

#### **3. @Memo Feature**
**Priority:** MEDIUM  
**Estimated Time:** 4-6 hours

**Features:**
- Personal notes to self with attachments
- New sidebar navigation under @Mentions
- Works like Group Chat but private
- Can include attachments, photos
- Searchable and filterable

**Implementation:**
- New database table: `staff_memos`
- New page: `MemoPage.tsx`
- Similar UI to Group Chat
- Private (only visible to creator)

---

### **🔧 TECHNICAL DEBT & FIXES:**

#### **4. Attachments - General Fixes**
**Priority:** MEDIUM  
**Estimated Time:** 6-8 hours

**Scope:**
- Fix attachments across all ticket types (Email, Phone, Chat)
- Live Chat widget attachment handling
- Ticket detail page attachment display
- Consistent download behavior
- Image preview consistency

---

### **🤖 AI AGENT UPGRADES:**

#### **5. FAM Agent - RAG & Vectorization**
**Priority:** MEDIUM  
**Estimated Time:** 8-10 hours

**Features:**
- Implement RAG similar to McCarthy AI
- Vector embeddings for FAM knowledge base
- Semantic search for FAM-related queries
- Training data ingestion

#### **6. Artwork Analyzer Agent - RAG & Vectorization**
**Priority:** MEDIUM  
**Estimated Time:** 8-10 hours

**Features:**
- Implement RAG for artwork analysis
- Vector embeddings for artwork knowledge
- Image analysis with AI
- Design guidelines and best practices

#### **7. Agent Cloning Documentation**
**Priority:** LOW  
**Estimated Time:** 2-3 hours

**Deliverable:**
- Step-by-step guide to clone FAM Agent
- How to add specialized skills
- Configuration templates
- Testing procedures

---

### **🛒 SHOPIFY INTEGRATION:**

#### **8. Shopify Data Display Enhancement**
**Priority:** MEDIUM  
**Estimated Time:** 6-8 hours

**Features:**
- Reformat order data display
- Add preview links, edit links
- URL shortener integration
- Configurable data fields
- Settings page for what to show/hide

---

### **📋 TASK MANAGEMENT SYSTEM:**

#### **9. Full Task Management with McCarthy AI Task Manager**
**Priority:** HIGH (Future Sprint)  
**Estimated Time:** 20-30 hours

**Features:**
- Task creation from Group Chat mentions
- Task tickets (similar to support tickets)
- Sub-tasks and parent-child relationships
- McCarthy AI as Task Manager Agent
- Automatic reminders and follow-ups
- Deadline tracking
- Task assignment and reassignment
- Task chat (response area for collaboration)
- Integration with tickets, Group Chat, Mentions

**Components:**
- New database tables: `task_tickets`, `task_assignments`, `task_comments`
- New page: `TaskManagerPage.tsx`
- McCarthy AI Task Manager Agent
- Task notification system
- Task queue and filtering

---

### **📊 SUMMARY:**

**Immediate (Next 1-2 Sessions):**
1. ✅ Mentions Quick Filter Pills
2. ✅ Group Chat Configurable Timeframe
3. ✅ @Memo Feature

**Short Term (Next Week):**
4. Attachments Fixes
5. FAM Agent Upgrade
6. Artwork Analyzer Upgrade

**Medium Term (Next 2 Weeks):**
7. Shopify Integration Enhancement
8. Agent Cloning Documentation

**Long Term (Future Sprint):**
9. Full Task Management System

---

*Last Updated: December 8, 2025, 12:00 AM AEST*
