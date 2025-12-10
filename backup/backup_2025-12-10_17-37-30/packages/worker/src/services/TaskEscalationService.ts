/**
 * Task Escalation Service
 * Handles automatic escalation of overdue tasks through the hierarchy:
 * Task Manager → Team Leader → Manager → Admin
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
  escalation_level: number
  last_escalated_at: string | null
}

interface StaffUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export class TaskEscalationService {
  constructor(private env: Env) {}

  /**
   * Check for overdue tasks that need escalation
   */
  async checkAndEscalateOverdueTasks(): Promise<void> {
    console.log('[TaskEscalation] Checking for overdue tasks needing escalation...')
    
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Get overdue tasks
    const { results: overdueTasks } = await this.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, status, priority, assigned_to, sla_due_at, 
             created_at, escalation_level, last_escalated_at
      FROM tickets
      WHERE channel = 'task'
        AND status NOT IN ('completed', 'cancelled')
        AND sla_due_at IS NOT NULL
        AND sla_due_at < ?
        AND deleted_at IS NULL
    `).bind(now.toISOString()).all() as { results: Task[] }
    
    console.log(`[TaskEscalation] Found ${overdueTasks.length} overdue tasks`)
    
    for (const task of overdueTasks) {
      // Check if task needs escalation
      const needsEscalation = this.shouldEscalate(task, now)
      if (needsEscalation) {
        await this.escalateTask(task)
      }
    }
  }

  /**
   * Determine if a task should be escalated
   */
  private shouldEscalate(task: Task, now: Date): boolean {
    // If never escalated, escalate if overdue by more than 1 hour
    if (!task.last_escalated_at) {
      const overdueBy = now.getTime() - new Date(task.sla_due_at!).getTime()
      return overdueBy > 60 * 60 * 1000 // 1 hour
    }
    
    // If already escalated, escalate again after 4 hours
    const lastEscalation = new Date(task.last_escalated_at)
    const timeSinceEscalation = now.getTime() - lastEscalation.getTime()
    return timeSinceEscalation > 4 * 60 * 60 * 1000 // 4 hours
  }

  /**
   * Escalate a task to the next level
   */
  private async escalateTask(task: Task): Promise<void> {
    try {
      const currentLevel = task.escalation_level || 0
      const nextLevel = currentLevel + 1
      
      // Escalation hierarchy:
      // Level 0: Task Manager (automated reminder)
      // Level 1: Team Leader
      // Level 2: Manager
      // Level 3: Admin
      
      if (nextLevel > 3) {
        console.log(`[TaskEscalation] Task ${task.ticket_number} already at max escalation level`)
        return
      }
      
      // Get Task channel
      const taskChannel = await this.env.DB.prepare(`
        SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
      `).first<{ id: string }>()
      
      if (!taskChannel) {
        console.log('[TaskEscalation] Task channel not found')
        return
      }
      
      // Get assigned staff
      let assignedStaff: StaffUser | null = null
      if (task.assigned_to) {
        assignedStaff = await this.env.DB.prepare(`
          SELECT id, first_name, last_name, email, role FROM staff_users WHERE id = ?
        `).bind(task.assigned_to).first<StaffUser>()
      }
      
      // Get escalation target
      const escalationTarget = await this.getEscalationTarget(nextLevel)
      if (!escalationTarget) {
        console.log(`[TaskEscalation] No escalation target found for level ${nextLevel}`)
        return
      }
      
      // Create escalation message
      const message = this.buildEscalationMessage(task, assignedStaff, escalationTarget, nextLevel)
      
      // Post to Task channel
      const messageId = `msg-${crypto.randomUUID()}`
      await this.env.DB.prepare(`
        INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
        VALUES (?, ?, 'system', 'system', ?, ?)
      `).bind(messageId, taskChannel.id, message, new Date().toISOString()).run()
      
      // Create mention for escalation target
      await this.env.DB.prepare(`
        INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
        VALUES (?, ?, ?, 'system', 'staff', 'group_chat', ?, ?)
      `).bind(
        crypto.randomUUID(),
        messageId,
        escalationTarget.id,
        taskChannel.id,
        new Date().toISOString()
      ).run()
      
      // Update task escalation level
      await this.env.DB.prepare(`
        UPDATE tickets 
        SET escalation_level = ?, last_escalated_at = ?, updated_at = ?
        WHERE ticket_id = ?
      `).bind(nextLevel, new Date().toISOString(), new Date().toISOString(), task.ticket_id).run()
      
      console.log(`[TaskEscalation] Escalated task ${task.ticket_number} to level ${nextLevel} (${this.getLevelName(nextLevel)})`)
    } catch (error) {
      console.error(`[TaskEscalation] Failed to escalate task ${task.ticket_number}:`, error)
    }
  }

  /**
   * Get escalation target for a given level
   */
  private async getEscalationTarget(level: number): Promise<StaffUser | null> {
    // Level 1: Team Leader (first staff with 'manager' role)
    // Level 2: Manager (first staff with 'manager' role)
    // Level 3: Admin (first staff with 'admin' role)
    
    let role = 'manager'
    if (level === 3) {
      role = 'admin'
    }
    
    const target = await this.env.DB.prepare(`
      SELECT id, first_name, last_name, email, role 
      FROM staff_users 
      WHERE role = ? 
      LIMIT 1
    `).bind(role).first<StaffUser>()
    
    return target
  }

  /**
   * Build escalation message
   */
  private buildEscalationMessage(
    task: Task,
    assignedStaff: StaffUser | null,
    escalationTarget: StaffUser,
    level: number
  ): string {
    const taskMention = `*${task.ticket_number.replace('TSK-', '')}`
    const targetMention = `@${escalationTarget.first_name.toLowerCase()}`
    const assignedMention = assignedStaff ? `@${assignedStaff.first_name.toLowerCase()}` : 'Unassigned'
    
    const levelName = this.getLevelName(level)
    const deadline = new Date(task.sla_due_at!)
    const now = new Date()
    const overdueDays = Math.floor((now.getTime() - deadline.getTime()) / (24 * 60 * 60 * 1000))
    
    let message = `${targetMention} 🚨 ESCALATION LEVEL ${level} (${levelName})\n\n`
    message += `Task ${taskMention} is OVERDUE by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}\n\n`
    message += `"${task.subject}"\n\n`
    message += `Assigned to: ${assignedMention}\n`
    message += `Priority: ${task.priority}\n`
    message += `Status: ${task.status}\n\n`
    message += `⚠️ This task requires immediate attention.`
    
    return message
  }

  /**
   * Get level name
   */
  private getLevelName(level: number): string {
    switch (level) {
      case 1: return 'Team Leader'
      case 2: return 'Manager'
      case 3: return 'Admin'
      default: return 'Unknown'
    }
  }
}

