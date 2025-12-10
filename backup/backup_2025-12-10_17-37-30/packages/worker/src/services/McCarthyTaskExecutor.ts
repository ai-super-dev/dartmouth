/**
 * McCarthy AI Task Executor
 * Handles AI-driven task execution with human-in-the-loop approval workflow
 */

import { Env } from '../types'

interface Task {
  ticket_id: string
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  assigned_to: string | null
  sla_due_at: string | null
  created_at: string
}

interface TaskDraft {
  id: string
  task_id: string
  draft_type: 'response' | 'action' | 'update'
  content: string
  metadata: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export class McCarthyTaskExecutor {
  constructor(private env: Env) {}

  /**
   * Generate AI draft for a task
   */
  async generateTaskDraft(taskId: string, draftType: 'response' | 'action' | 'update'): Promise<string> {
    try {
      // Get task details
      const task = await this.env.DB.prepare(`
        SELECT ticket_id, ticket_number, subject, description, status, priority, assigned_to, sla_due_at, created_at
        FROM tickets
        WHERE ticket_id = ? AND channel = 'task'
      `).bind(taskId).first<Task>()

      if (!task) {
        throw new Error('Task not found')
      }

      // Get task messages/notes for context
      const { results: notes } = await this.env.DB.prepare(`
        SELECT content, created_at FROM internal_notes WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 5
      `).bind(taskId).all()

      // Build context for AI
      const context = this.buildTaskContext(task, notes as any[])

      // Generate AI draft based on type
      let prompt = ''
      switch (draftType) {
        case 'response':
          prompt = `Based on this task, generate a professional response or update:\n\n${context}\n\nProvide a clear, actionable response.`
          break
        case 'action':
          prompt = `Based on this task, suggest the next action to take:\n\n${context}\n\nProvide specific, actionable steps.`
          break
        case 'update':
          prompt = `Based on this task, generate a status update:\n\n${context}\n\nProvide a concise status update.`
          break
      }

      // Call AI (using Workers AI)
      const aiResponse = await this.env.WORKERS_AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are McCarthy AI, a helpful task management assistant. Provide clear, professional, and actionable responses.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      }) as any

      const draftContent = aiResponse.response || 'Unable to generate draft'

      // Save draft to database
      const draftId = crypto.randomUUID()
      await this.env.DB.prepare(`
        INSERT INTO task_drafts (id, task_id, draft_type, content, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).bind(draftId, taskId, draftType, draftContent, new Date().toISOString()).run()

      console.log(`[McCarthy] Generated ${draftType} draft for task ${task.ticket_number}`)

      return draftId
    } catch (error) {
      console.error('[McCarthy] Error generating task draft:', error)
      throw error
    }
  }

  /**
   * Approve a task draft
   */
  async approveDraft(draftId: string, staffId: string): Promise<void> {
    try {
      // Get draft
      const draft = await this.env.DB.prepare(`
        SELECT id, task_id, draft_type, content, status FROM task_drafts WHERE id = ?
      `).bind(draftId).first<TaskDraft>()

      if (!draft) {
        throw new Error('Draft not found')
      }

      if (draft.status !== 'pending') {
        throw new Error('Draft already processed')
      }

      // Update draft status
      await this.env.DB.prepare(`
        UPDATE task_drafts SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?
      `).bind(staffId, new Date().toISOString(), draftId).run()

      // Execute the approved action
      await this.executeDraft(draft, staffId)

      console.log(`[McCarthy] Draft ${draftId} approved and executed`)
    } catch (error) {
      console.error('[McCarthy] Error approving draft:', error)
      throw error
    }
  }

  /**
   * Reject a task draft
   */
  async rejectDraft(draftId: string, staffId: string, reason?: string): Promise<void> {
    try {
      await this.env.DB.prepare(`
        UPDATE task_drafts SET status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ? WHERE id = ?
      `).bind(staffId, new Date().toISOString(), reason || null, draftId).run()

      console.log(`[McCarthy] Draft ${draftId} rejected`)
    } catch (error) {
      console.error('[McCarthy] Error rejecting draft:', error)
      throw error
    }
  }

  /**
   * Execute an approved draft
   */
  private async executeDraft(draft: TaskDraft, staffId: string): Promise<void> {
    const now = new Date().toISOString()

    switch (draft.draft_type) {
      case 'response':
      case 'update':
        // Add as internal note
        await this.env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, ?, 'ai_generated', ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          draft.task_id,
          'ai-agent-001',
          `[AI Generated - Approved by Staff]\n\n${draft.content}`,
          now,
          now
        ).run()
        break

      case 'action':
        // Add as internal note with action tag
        await this.env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, ?, 'action', ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          draft.task_id,
          'ai-agent-001',
          `[AI Suggested Action - Approved by Staff]\n\n${draft.content}`,
          now,
          now
        ).run()
        break
    }
  }

  /**
   * Build context for AI from task data
   */
  private buildTaskContext(task: Task, notes: any[]): string {
    let context = `Task: ${task.ticket_number}\n`
    context += `Subject: ${task.subject}\n`
    context += `Description: ${task.description || 'N/A'}\n`
    context += `Status: ${task.status}\n`
    context += `Priority: ${task.priority}\n`

    if (task.sla_due_at) {
      context += `Deadline: ${new Date(task.sla_due_at).toLocaleString()}\n`
    }

    if (notes && notes.length > 0) {
      context += `\nRecent Notes:\n`
      notes.forEach((note, i) => {
        context += `${i + 1}. ${note.content}\n`
      })
    }

    return context
  }
}

