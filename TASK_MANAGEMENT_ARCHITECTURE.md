# 📋 TASK MANAGEMENT SYSTEM - ARCHITECTURE DOCUMENT

**Created:** December 6, 2025, 10:00 AM AEST  
**Status:** 🚀 **SUPER IMPORTANT - HIGH PRIORITY**  
**Version:** 1.0  
**Inspiration:** Shower thoughts! 🚿💡

---

## 🎯 **EXECUTIVE SUMMARY**

The Task Management System transforms Dartmouth OS from a customer service platform into a **complete operations management system**. It enables staff to assign work to each other, track progress, set deadlines, and most importantly, **McCarthy AI becomes the Task Manager** - automatically reminding staff about deadlines, escalating overdue tasks, and managing the entire task workflow.

### **Key Innovation: McCarthy AI as Task Manager**
McCarthy AI isn't just a task executor - it's the **intelligent task coordinator** that:
- 🔔 Sends deadline reminders
- ⚠️ Escalates overdue tasks
- 📊 Provides daily task digests
- 🎯 Suggests task prioritization
- 🤖 Executes assigned tasks autonomously

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Core Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                   TASK MANAGEMENT SYSTEM                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         MCCARTHY AI - TASK MANAGER                 │    │
│  │                                                     │    │
│  │  • Deadline Monitoring (every 5 mins)              │    │
│  │  • Reminder Notifications (1hr, 30min, overdue)    │    │
│  │  • Daily Digest (8am daily)                        │    │
│  │  • Overdue Escalation (to managers)                │    │
│  │  • Task Execution (when assigned to AI)            │    │
│  │  • Smart Prioritization Suggestions                │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │              TASK DATABASE                         │    │
│  │  • tasks                                           │    │
│  │  • task_comments                                   │    │
│  │  • task_history                                    │    │
│  │  • task_reminders                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │           INTEGRATION POINTS                       │    │
│  │  • Tickets (create tasks from tickets)             │    │
│  │  • Group Chat (create tasks from @mentions)        │    │
│  │  • @Mentions (notify about task assignments)       │    │
│  │  • Notifications (desktop + email alerts)          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **DATABASE SCHEMA**

### **Table: `tasks`**

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Assignment
  created_by TEXT NOT NULL,              -- Staff ID who created task
  assigned_to TEXT NOT NULL,             -- Staff ID or 'ai-agent-001'
  assigned_to_name TEXT,                 -- For display
  
  -- Priority & Status
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'reopened', 'cancelled'
  
  -- Deadlines
  deadline TEXT,                         -- ISO timestamp
  deadline_reminder_sent INTEGER DEFAULT 0,
  overdue_escalation_sent INTEGER DEFAULT 0,
  
  -- Context (what is this task related to?)
  context_type TEXT,                     -- 'ticket', 'group_chat', 'standalone'
  context_id TEXT,                       -- Ticket ID or Channel ID
  ticket_id TEXT,                        -- Direct ticket link
  ticket_number TEXT,                    -- For display (e.g., TKT-000261)
  customer_name TEXT,                    -- If related to ticket
  
  -- Tracking
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,                       -- When status changed to 'in_progress'
  completed_at TEXT,                     -- When marked complete
  completed_by TEXT,                     -- Staff ID who completed
  
  -- Reopening
  reopened_at TEXT,
  reopened_by TEXT,
  reopen_reason TEXT,
  reopen_count INTEGER DEFAULT 0,
  
  -- AI Specific
  ai_result TEXT,                        -- Result/output from McCarthy AI
  ai_status TEXT,                        -- 'queued', 'processing', 'complete', 'failed'
  ai_started_at TEXT,
  ai_completed_at TEXT,
  ai_error TEXT,
  
  -- Metadata
  tags TEXT,                             -- JSON array of tags
  estimated_duration INTEGER,            -- Minutes
  actual_duration INTEGER                -- Minutes (calculated)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_ticket ON tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(deadline, status) WHERE status != 'completed';
```

### **Table: `task_comments`**

```sql
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Attachments
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_staff ON task_comments(staff_id);
```

### **Table: `task_history`**

```sql
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  action TEXT NOT NULL,                  -- 'created', 'assigned', 'started', 'completed', 'reopened', 'cancelled', 'deadline_changed', 'priority_changed'
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  details TEXT,                          -- JSON with additional info
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_history_action ON task_history(action);
```

### **Table: `task_reminders`**

```sql
CREATE TABLE IF NOT EXISTS task_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,           -- '1_hour', '30_min', 'overdue', 'daily_digest'
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_to TEXT NOT NULL,                 -- Staff ID
  notification_method TEXT NOT NULL,     -- 'mention', 'email', 'desktop'
  reminder_content TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_sent_to ON task_reminders(sent_to, sent_at);
```

---

## 🤖 **MCCARTHY AI - TASK MANAGER**

### **1. Deadline Monitoring (Cron Job - Every 5 Minutes)**

```javascript
// Runs every 5 minutes via Cloudflare Cron Trigger
async function monitorTaskDeadlines() {
  const now = new Date();
  
  // Get all pending/in-progress tasks with deadlines
  const tasks = await db.query(`
    SELECT * FROM tasks 
    WHERE status IN ('pending', 'in_progress')
    AND deadline IS NOT NULL
    AND deadline != ''
  `);
  
  for (const task of tasks) {
    const deadline = new Date(task.deadline);
    const timeUntilDeadline = deadline - now;
    const hoursUntil = timeUntilDeadline / (1000 * 60 * 60);
    
    // 1 hour warning
    if (hoursUntil <= 1 && hoursUntil > 0.5 && !task.deadline_reminder_sent) {
      await sendDeadlineReminder(task, '1_hour');
      await markReminderSent(task.id, '1_hour');
    }
    
    // 30 minute warning
    if (hoursUntil <= 0.5 && hoursUntil > 0 && !task.deadline_reminder_sent) {
      await sendDeadlineReminder(task, '30_min');
      await markReminderSent(task.id, '30_min');
    }
    
    // Overdue escalation
    if (timeUntilDeadline < 0 && !task.overdue_escalation_sent) {
      await escalateOverdueTask(task);
      await markEscalationSent(task.id);
    }
  }
}
```

### **2. Reminder Notifications**

#### **1 Hour Warning:**
```
McCarthy AI in #general:
"⏰ @john - Task reminder: 'Reprint damaged order for TKT-000261' is due in 1 hour (Priority: High)"
```

#### **30 Minute Warning:**
```
McCarthy AI in #general:
"🚨 @john - URGENT: Task 'Reprint damaged order for TKT-000261' is due in 30 minutes!"
```

#### **Overdue Escalation:**
```
McCarthy AI in #management:
"⚠️ OVERDUE TASK ALERT
Task: 'Reprint damaged order for TKT-000261'
Assigned to: @john
Was due: 2 hours ago
Priority: High
Ticket: TKT-000261
Please follow up."
```

### **3. Daily Task Digest (8:00 AM Daily)**

```javascript
// Runs at 8:00 AM daily
async function sendDailyTaskDigest() {
  const staff = await getAllActiveStaff();
  
  for (const staffMember of staff) {
    const tasks = await getStaffTasks(staffMember.id);
    
    const pending = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const dueTod ay = tasks.filter(t => isDueToday(t.deadline));
    const overdue = tasks.filter(t => isOverdue(t.deadline));
    
    const digest = `
📋 Good morning ${staffMember.first_name}! Here's your task summary:

📌 Pending: ${pending.length}
🔄 In Progress: ${inProgress.length}
⏰ Due Today: ${dueToday.length}
🚨 Overdue: ${overdue.length}

${overdue.length > 0 ? '⚠️ OVERDUE TASKS:\n' + formatTaskList(overdue) : ''}
${dueToday.length > 0 ? '📅 DUE TODAY:\n' + formatTaskList(dueToday) : ''}

View all tasks: https://dashboard.com/tasks
    `;
    
    await sendMentionNotification(staffMember.id, digest);
  }
}
```

### **4. Smart Task Prioritization**

```javascript
// McCarthy AI analyzes tasks and suggests prioritization
async function suggestTaskPrioritization(staffId) {
  const tasks = await getStaffTasks(staffId);
  
  // AI analyzes:
  // - Deadlines
  // - Priority levels
  // - Ticket urgency (if linked)
  // - Customer VIP status
  // - Task dependencies
  
  const suggestions = await analyzeWithAI(tasks);
  
  return {
    urgent: tasks.filter(t => suggestions.isUrgent(t)),
    today: tasks.filter(t => suggestions.shouldDoToday(t)),
    thisWeek: tasks.filter(t => suggestions.shouldDoThisWeek(t)),
    canDelegate: tasks.filter(t => suggestions.canDelegate(t))
  };
}
```

### **5. Task Execution (When Assigned to McCarthy AI)**

```javascript
// When a task is assigned to 'ai-agent-001'
async function executeAITask(task) {
  await updateTaskStatus(task.id, 'in_progress');
  
  try {
    // Parse task description for action
    const action = parseTaskAction(task.description);
    
    switch (action.type) {
      case 'draft_email':
        const draft = await draftEmailResponse(task.ticket_id);
        await saveTaskResult(task.id, draft);
        break;
        
      case 'send_message':
        await sendMessageToCustomer(task.ticket_id, action.message);
        break;
        
      case 'schedule_callback':
        await scheduleCallback(task.ticket_id, action.time);
        break;
        
      case 'fetch_order_status':
        const status = await fetchShopifyOrder(action.orderId);
        await saveTaskResult(task.id, status);
        break;
        
      // ... more actions
    }
    
    await completeTask(task.id, 'ai-agent-001');
    await notifyTaskCreator(task, 'Task completed by McCarthy AI');
    
  } catch (error) {
    await failTask(task.id, error.message);
    await notifyTaskCreator(task, 'Task failed - please review');
  }
}
```

---

## 🔌 **API ENDPOINTS**

### **Tasks:**
- `GET /api/tasks` - List all tasks (with filters)
- `GET /api/tasks/my-tasks` - Get tasks assigned to me
- `GET /api/tasks/created-by-me` - Get tasks I created
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Cancel task
- `POST /api/tasks/:id/complete` - Mark task as complete
- `POST /api/tasks/:id/reopen` - Reopen completed task
- `POST /api/tasks/:id/start` - Mark task as in progress
- `POST /api/tasks/:id/reassign` - Reassign task to another staff

### **Task Comments:**
- `GET /api/tasks/:id/comments` - Get task comments
- `POST /api/tasks/:id/comments` - Add comment to task

### **Task Analytics:**
- `GET /api/tasks/stats` - Get task statistics
- `GET /api/tasks/overdue` - Get all overdue tasks
- `GET /api/tasks/due-today` - Get tasks due today
- `GET /api/tasks/staff-performance` - Get staff task completion metrics

### **McCarthy AI:**
- `POST /api/tasks/ai/execute` - Trigger AI task execution
- `GET /api/tasks/ai/queue` - Get AI task queue
- `POST /api/tasks/ai/remind` - Trigger reminder check (manual)

---

## 🎨 **FRONTEND UI DESIGN**

### **Tasks Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Tasks                                    [+ New Task]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tabs: [My Tasks] [Created by Me] [All Tasks] [Completed]  │
│                                                              │
│  Filters: [Priority ▼] [Deadline ▼] [Status ▼] [Staff ▼]  │
│                                                              │
├──────────────────────────┬──────────────────────────────────┤
│  TASK LIST               │  TASK DETAILS                    │
│                          │                                  │
│  🚨 OVERDUE (3)          │  Task: Reprint damaged order     │
│  ├─ Reprint order        │  Priority: 🔴 High               │
│  │  @john • 2h overdue   │  Status: In Progress             │
│  │  TKT-000261           │  Deadline: 2 hours ago           │
│  │                       │  Assigned to: @john              │
│  ├─ Follow up artwork    │  Created by: @sarah              │
│  │  @gaille • 5h overdue │                                  │
│  │                       │  📝 Description:                 │
│  📅 DUE TODAY (5)        │  Customer's package arrived      │
│  ├─ Draft email response │  damaged. Need to process        │
│  │  @mccarthy • 2h left  │  reprint urgently.               │
│  │  TKT-000262           │                                  │
│  │                       │  🎫 Related Ticket:              │
│  🔄 IN PROGRESS (8)      │  TKT-000261 - Jane Smith         │
│  ├─ ...                  │  [View Ticket →]                 │
│  │                       │                                  │
│  📌 PENDING (12)         │  💬 Comments (3):                │
│  ├─ ...                  │  @sarah: Started processing      │
│  │                       │  @john: Reprint queued           │
│                          │                                  │
│                          │  [Add Comment]                   │
│                          │  [✓ Complete] [↻ Reassign]       │
└──────────────────────────┴──────────────────────────────────┘
```

### **Quick Task Creation:**

#### **From Ticket (Staff Notes):**
```
Staff Notes textarea:
"@gaille please follow up with customer about artwork approval, deadline: tomorrow 5pm, priority: high"

System detects:
- @mention → creates task
- deadline keyword → sets deadline
- priority keyword → sets priority
- Auto-links to current ticket
```

#### **From Group Chat:**
```
#customer-service:
"@john can you check the order status for TKT-000261?"

System:
- Creates task for @john
- Links to TKT-000261
- Posts confirmation in chat
```

#### **From Tasks Page:**
```
[+ New Task] button opens modal:
- Title: [____________]
- Description: [____________]
- Assign to: [@john ▼]
- Priority: [Medium ▼]
- Deadline: [Date/Time picker]
- Link to ticket: [TKT-____]
- Tags: [urgent] [reprint] [+]
```

---

## 🔔 **NOTIFICATION SYSTEM**

### **Notification Types:**

1. **Task Assigned**
   - "📋 @john - New task assigned: 'Reprint damaged order' (Priority: High, Due: 2 hours)"

2. **Deadline Reminder (1 hour)**
   - "⏰ @john - Task reminder: 'Reprint damaged order' is due in 1 hour"

3. **Deadline Reminder (30 min)**
   - "🚨 @john - URGENT: Task 'Reprint damaged order' is due in 30 minutes!"

4. **Overdue Alert**
   - "⚠️ @john - Task 'Reprint damaged order' is now OVERDUE (was due 2 hours ago)"

5. **Task Completed**
   - "✅ @sarah - @john completed your task: 'Reprint damaged order'"

6. **Task Reopened**
   - "↻ @john - @sarah reopened your task: 'Reprint damaged order' (Reason: Incorrect address)"

7. **Task Comment**
   - "💬 @john - @sarah commented on task: 'Reprint damaged order'"

8. **Daily Digest**
   - "📋 Good morning @john! You have 3 tasks due today, 2 overdue..."

### **Notification Channels:**
- **@Mentions** (in Group Chat)
- **Desktop Notifications** (browser)
- **Email** (optional, for critical/overdue)
- **In-App Badge** (unread count on Tasks icon)

---

## 🔄 **TASK WORKFLOW**

### **Standard Task Flow:**

```
1. CREATION
   ↓
   Staff creates task → @mention notification sent
   ↓
2. ASSIGNMENT
   ↓
   Task appears in assignee's "My Tasks"
   ↓
3. START
   ↓
   Staff clicks "Start" → status: in_progress
   ↓
4. REMINDERS
   ↓
   McCarthy AI monitors deadline
   ├─ 1 hour warning
   ├─ 30 min warning
   └─ Overdue escalation
   ↓
5. COMPLETION
   ↓
   Staff clicks "Complete" → status: completed
   ↓
   Task creator notified
   ↓
6. VERIFICATION (Optional)
   ↓
   If incorrect: Reopen task
   If correct: Task archived
```

### **AI Task Flow:**

```
1. CREATION
   ↓
   "@mccarthy draft email for TKT-000261, deadline: 1 hour"
   ↓
2. AI QUEUES TASK
   ↓
   status: pending, assigned_to: ai-agent-001
   ↓
3. AI EXECUTES
   ↓
   status: in_progress
   ├─ Fetch ticket details
   ├─ Search RAG knowledge
   ├─ Generate draft
   └─ Save result
   ↓
4. AI COMPLETES
   ↓
   status: completed, ai_result: "[draft email content]"
   ↓
5. NOTIFY CREATOR
   ↓
   "@sarah - McCarthy AI completed your task. Review draft: [link]"
```

---

## 📊 **ANALYTICS & REPORTING**

### **Staff Performance Metrics:**
- Tasks completed vs assigned
- Average completion time
- Overdue task rate
- Task completion rate by priority
- Response time (assignment → start)

### **Team Metrics:**
- Total active tasks
- Overdue tasks count
- Tasks completed today/week/month
- Average task duration
- Bottleneck identification

### **McCarthy AI Metrics:**
- AI tasks executed
- AI success rate
- AI average execution time
- Reminders sent
- Escalations triggered

---

## 🚀 **DEPLOYMENT PLAN**

### **Phase 1: Core Task System (8 hours)**
1. Database schema + migration
2. Backend API (CRUD operations)
3. Tasks Page UI (list + detail)
4. Task creation from Tasks page

### **Phase 2: Integration (6 hours)**
5. Task creation from tickets (@mentions in staff notes)
6. Task creation from Group Chat
7. @Mentions integration (notifications)
8. Task linking to tickets

### **Phase 3: McCarthy AI - Task Manager (10 hours)**
9. Cron job for deadline monitoring
10. Reminder notification system
11. Daily digest generation
12. Overdue escalation
13. Smart prioritization

### **Phase 4: McCarthy AI - Task Executor (8 hours)**
14. AI task queue processor
15. Task action parser
16. AI action handlers (draft email, send message, etc.)
17. AI result storage & notification

### **Phase 5: Advanced Features (6 hours)**
18. Task comments
19. Task history tracking
20. Task reassignment
21. Task templates
22. Analytics dashboard

**Total Estimated Time:** 38 hours

---

## 🎯 **SUCCESS CRITERIA**

- ✅ Staff can create tasks and assign to others
- ✅ Tasks can be created from tickets and group chat
- ✅ McCarthy AI sends deadline reminders
- ✅ McCarthy AI escalates overdue tasks
- ✅ McCarthy AI sends daily task digests
- ✅ McCarthy AI can execute assigned tasks
- ✅ Tasks integrate with @mentions
- ✅ Task completion notifications work
- ✅ Task reopening works
- ✅ Analytics show team performance

---

## 💡 **FUTURE ENHANCEMENTS**

- **Recurring Tasks** - Weekly reports, monthly reviews
- **Task Templates** - Pre-defined workflows
- **Task Dependencies** - Task B can't start until Task A complete
- **Subtasks** - Break large tasks into smaller ones
- **Time Tracking** - Log actual time spent on tasks
- **Kanban Board View** - Visual task management
- **Task Automation** - Auto-create tasks based on triggers
- **Mobile App** - Task management on the go
- **Voice Commands** - "McCarthy, remind me about this task in 1 hour"

---

**Status:** 📋 **DOCUMENTED - READY FOR IMPLEMENTATION**

**Priority:** 🚨 **SUPER IMPORTANT - BUILD NOW!**

---

*"The best ideas come in the shower!" - John, December 6, 2025* 🚿💡

