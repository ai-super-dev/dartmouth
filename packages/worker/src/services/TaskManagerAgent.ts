/**
 * Task Manager Agent
 * Monitors task deadlines, sends reminders, and coordinates task workflow
 */

import { Env } from '../types'

interface Task {
  ticket_id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  assigned_to: string | null
  sla_due_at: string | null
  created_at: string
  parent_task_id: string | null
}

interface StaffUser {
  id: string
  first_name: string
  last_name: string
  email: string
}

export class TaskManagerAgent {
  constructor(private env: Env) {}

  /**
   * Check for tasks with approaching deadlines (within 24 hours)
   */
  async checkApproachingDeadlines(): Promise<void> {
    console.log('[TaskManager] Checking for approaching deadlines...')
    
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const { results: tasks } = await this.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, status, priority, assigned_to, sla_due_at, created_at, parent_task_id
      FROM tickets
      WHERE channel = 'task'
        AND status NOT IN ('completed', 'cancelled')
        AND sla_due_at IS NOT NULL
        AND sla_due_at <= ?
        AND sla_due_at > ?
        AND deleted_at IS NULL
    `).bind(in24Hours.toISOString(), now.toISOString()).all() as { results: Task[] }
    
    console.log(`[TaskManager] Found ${tasks.length} tasks with approaching deadlines`)
    
    for (const task of tasks) {
      await this.sendDeadlineReminder(task, 'approaching')
    }
  }

  /**
   * Check for overdue tasks
   */
  async checkOverdueTasks(): Promise<void> {
    console.log('[TaskManager] Checking for overdue tasks...')
    
    const now = new Date()
    
    const { results: tasks } = await this.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, status, priority, assigned_to, sla_due_at, created_at, parent_task_id
      FROM tickets
      WHERE channel = 'task'
        AND status NOT IN ('completed', 'cancelled')
        AND sla_due_at IS NOT NULL
        AND sla_due_at < ?
        AND deleted_at IS NULL
    `).bind(now.toISOString()).all() as { results: Task[] }
    
    console.log(`[TaskManager] Found ${tasks.length} overdue tasks`)
    
    for (const task of tasks) {
      await this.sendDeadlineReminder(task, 'overdue')
    }
  }

  /**
   * Send deadline reminder to Task channel
   */
  private async sendDeadlineReminder(task: Task, type: 'approaching' | 'overdue'): Promise<void> {
    try {
      // Get assigned staff info
      const staff = await this.env.DB.prepare(`
        SELECT id, first_name, last_name, email FROM staff_users WHERE id = ?
      `).bind(task.assigned_to).first<StaffUser>()
      
      if (!staff) {
        console.log(`[TaskManager] No staff found for task ${task.ticket_number}`)
        return
      }
      
      // Get Task channel
      const taskChannel = await this.env.DB.prepare(`
        SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
      `).first<{ id: string }>()
      
      if (!taskChannel) {
        console.log('[TaskManager] Task channel not found')
        return
      }
      
      // Format deadline
      const deadline = new Date(task.sla_due_at!)
      const deadlineStr = deadline.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      
      // Create message
      const staffMention = `@${staff.first_name.toLowerCase()}`
      const taskMention = `*${task.ticket_number.replace('TSK-', '')}`
      
      let message: string
      if (type === 'approaching') {
        message = `${staffMention} ⏰ Task ${taskMention} deadline approaching: ${deadlineStr}\n\n"${task.subject}"`
      } else {
        message = `${staffMention} 🚨 Task ${taskMention} is OVERDUE (was due: ${deadlineStr})\n\n"${task.subject}"\n\nPlease update status or escalate.`
      }
      
      // Post to Task channel
      const messageId = `msg-${crypto.randomUUID()}`
      await this.env.DB.prepare(`
        INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
        VALUES (?, ?, 'system', 'system', ?, ?)
      `).bind(messageId, taskChannel.id, message, new Date().toISOString()).run()
      
      // Create mention
      await this.env.DB.prepare(`
        INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
        VALUES (?, ?, ?, 'system', 'staff', 'group_chat', ?, ?)
      `).bind(
        crypto.randomUUID(),
        messageId,
        staff.id,
        taskChannel.id,
        new Date().toISOString()
      ).run()
      
      console.log(`[TaskManager] Sent ${type} reminder for task ${task.ticket_number} to ${staff.first_name}`)
    } catch (error) {
      console.error(`[TaskManager] Failed to send reminder for task ${task.ticket_number}:`, error)
    }
  }

  /**
   * Check for completed sub-tasks and notify parent task owner
   */
  async checkCompletedSubTasks(): Promise<void> {
    console.log('[TaskManager] Checking for completed sub-tasks...')
    
    // Get recently completed sub-tasks (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { results: completedSubTasks } = await this.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, parent_task_id, updated_at
      FROM tickets
      WHERE channel = 'task'
        AND parent_task_id IS NOT NULL
        AND status = 'completed'
        AND updated_at > ?
        AND deleted_at IS NULL
    `).bind(oneHourAgo.toISOString()).all() as { results: Task[] }
    
    console.log(`[TaskManager] Found ${completedSubTasks.length} recently completed sub-tasks`)
    
    for (const subTask of completedSubTasks) {
      await this.notifyParentTaskOwner(subTask)
    }
  }

  /**
   * Notify parent task owner about completed sub-task
   */
  private async notifyParentTaskOwner(subTask: Task): Promise<void> {
    try {
      // Get parent task
      const parentTask = await this.env.DB.prepare(`
        SELECT ticket_id, ticket_number, subject, assigned_to FROM tickets WHERE ticket_id = ?
      `).bind(subTask.parent_task_id).first<Task>()
      
      if (!parentTask || !parentTask.assigned_to) {
        return
      }
      
      // Get assigned staff
      const staff = await this.env.DB.prepare(`
        SELECT id, first_name, last_name FROM staff_users WHERE id = ?
      `).bind(parentTask.assigned_to).first<StaffUser>()
      
      if (!staff) return
      
      // Get Task channel
      const taskChannel = await this.env.DB.prepare(`
        SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
      `).first<{ id: string }>()
      
      if (!taskChannel) return
      
      // Create message
      const staffMention = `@${staff.first_name.toLowerCase()}`
      const subTaskMention = `*${subTask.ticket_number.replace('TSK-', '')}`
      const parentTaskMention = `*${parentTask.ticket_number.replace('TSK-', '')}`
      
      const message = `${staffMention} ✅ Sub-task ${subTaskMention} completed!\n\nParent task ${parentTaskMention} can now proceed: "${parentTask.subject}"`
      
      // Post to Task channel
      const messageId = `msg-${crypto.randomUUID()}`
      await this.env.DB.prepare(`
        INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
        VALUES (?, ?, 'system', 'system', ?, ?)
      `).bind(messageId, taskChannel.id, message, new Date().toISOString()).run()
      
      // Create mention
      await this.env.DB.prepare(`
        INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
        VALUES (?, ?, ?, 'system', 'staff', 'group_chat', ?, ?)
      `).bind(
        crypto.randomUUID(),
        messageId,
        staff.id,
        taskChannel.id,
        new Date().toISOString()
      ).run()
      
      console.log(`[TaskManager] Notified ${staff.first_name} about completed sub-task ${subTask.ticket_number}`)
    } catch (error) {
      console.error(`[TaskManager] Failed to notify about sub-task ${subTask.ticket_number}:`, error)
    }
  }

  /**
   * Run all task manager checks
   */
  async runAllChecks(): Promise<void> {
    console.log('[TaskManager] Running all checks...')
    await this.checkApproachingDeadlines()
    await this.checkOverdueTasks()
    await this.checkCompletedSubTasks()
    console.log('[TaskManager] All checks complete')
  }
}

