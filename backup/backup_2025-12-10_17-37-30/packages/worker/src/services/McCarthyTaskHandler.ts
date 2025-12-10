/**
 * McCarthy AI Task Handler
 * Handles AI-driven task execution with human-in-the-loop approval
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

interface AITaskDraft {
  id: string
  ticket_id: string
  draft_content: string
  confidence_score: number
  suggested_actions: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
}

export class McCarthyTaskHandler {
  constructor(private env: Env) {}

  /**
   * Generate AI draft for a task assigned to McCarthy
   */
  async generateTaskDraft(task: Task): Promise<AITaskDraft | null> {
    try {
      console.log(`[McCarthy] Generating draft for task ${task.ticket_number}`)
      
      // Check if task is assigned to McCarthy AI (special user ID or flag)
      // For now, we'll use a convention: if assigned_to is 'mccarthy-ai' or null with AI flag
      
      // Build prompt for AI
      const prompt = this.buildTaskPrompt(task)
      
      // Call OpenAI/Anthropic to generate draft
      const aiResponse = await this.callAI(prompt)
      
      if (!aiResponse) {
        return null
      }
      
      // Create draft record
      const draftId = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.env.DB.prepare(`
        INSERT INTO ai_task_drafts (
          id, ticket_id, draft_content, confidence_score, suggested_actions, 
          created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        draftId,
        task.ticket_id,
        aiResponse.content,
        aiResponse.confidence,
        JSON.stringify(aiResponse.actions),
        now
      ).run()
      
      // Post draft to Task channel for review
      await this.postDraftForReview(task, aiResponse)
      
      console.log(`[McCarthy] Draft created for task ${task.ticket_number}`)
      
      return {
        id: draftId,
        ticket_id: task.ticket_id,
        draft_content: aiResponse.content,
        confidence_score: aiResponse.confidence,
        suggested_actions: JSON.stringify(aiResponse.actions),
        created_at: now,
        status: 'pending'
      }
    } catch (error) {
      console.error(`[McCarthy] Failed to generate draft for task ${task.ticket_number}:`, error)
      return null
    }
  }

  /**
   * Build AI prompt for task
   */
  private buildTaskPrompt(task: Task): string {
    return `You are McCarthy AI, an intelligent task execution assistant. 
    
Task Details:
- Task Number: ${task.ticket_number}
- Subject: ${task.subject}
- Description: ${task.description}
- Priority: ${task.priority}
- Deadline: ${task.sla_due_at ? new Date(task.sla_due_at).toLocaleString() : 'None'}

Your job is to:
1. Analyze the task requirements
2. Propose a solution or action plan
3. Identify any dependencies or blockers
4. Suggest next steps

Provide your response in the following format:
ANALYSIS: [Your analysis of the task]
SOLUTION: [Your proposed solution]
DEPENDENCIES: [Any dependencies or requirements]
NEXT_STEPS: [Specific actionable steps]
CONFIDENCE: [Your confidence level 0-100]

Be concise and actionable.`
  }

  /**
   * Call AI service (OpenAI/Anthropic)
   */
  private async callAI(prompt: string): Promise<{ content: string; confidence: number; actions: string[] } | null> {
    try {
      // For now, return a mock response
      // In production, this would call OpenAI/Anthropic API
      
      const mockResponse = {
        content: `ANALYSIS: This task requires immediate attention based on the priority level.

SOLUTION: I recommend the following approach:
1. Review all related tickets and customer history
2. Coordinate with the assigned team member
3. Execute the required actions
4. Document the outcome

DEPENDENCIES: 
- Access to customer records
- Coordination with team members
- Approval for any customer-facing communications

NEXT_STEPS:
1. Gather all necessary information
2. Draft response/action plan
3. Submit for human approval
4. Execute upon approval
5. Follow up and close task

CONFIDENCE: 85`,
        confidence: 85,
        actions: [
          'Review customer history',
          'Draft action plan',
          'Submit for approval',
          'Execute approved actions',
          'Follow up and close'
        ]
      }
      
      return mockResponse
    } catch (error) {
      console.error('[McCarthy] AI call failed:', error)
      return null
    }
  }

  /**
   * Post draft to Task channel for human review
   */
  private async postDraftForReview(task: Task, aiResponse: { content: string; confidence: number; actions: string[] }): Promise<void> {
    try {
      // Get Task channel
      const taskChannel = await this.env.DB.prepare(`
        SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
      `).first<{ id: string }>()
      
      if (!taskChannel) {
        console.log('[McCarthy] Task channel not found')
        return
      }
      
      // Get assigned staff for mention
      let assignedStaff = null
      if (task.assigned_to) {
        assignedStaff = await this.env.DB.prepare(`
          SELECT id, first_name FROM staff_users WHERE id = ?
        `).bind(task.assigned_to).first<{ id: string; first_name: string }>()
      }
      
      // Build message
      const taskMention = `*${task.ticket_number.replace('TSK-', '')}`
      const staffMention = assignedStaff ? `@${assignedStaff.first_name.toLowerCase()}` : '@team'
      
      let message = `${staffMention} 🤖 McCarthy AI has completed task ${taskMention}\n\n`
      message += `"${task.subject}"\n\n`
      message += `📋 AI Draft Response:\n${aiResponse.content}\n\n`
      message += `Confidence: ${aiResponse.confidence}%\n\n`
      message += `⚠️ Please review and approve before execution.`
      
      // Post message
      const messageId = `msg-${crypto.randomUUID()}`
      await this.env.DB.prepare(`
        INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
        VALUES (?, ?, 'mccarthy-ai', 'system', ?, ?)
      `).bind(messageId, taskChannel.id, message, new Date().toISOString()).run()
      
      // Create mention if staff assigned
      if (assignedStaff) {
        await this.env.DB.prepare(`
          INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
          VALUES (?, ?, ?, 'system', 'staff', 'group_chat', ?, ?)
        `).bind(
          crypto.randomUUID(),
          messageId,
          assignedStaff.id,
          taskChannel.id,
          new Date().toISOString()
        ).run()
      }
      
      console.log(`[McCarthy] Posted draft for review in Task channel`)
    } catch (error) {
      console.error('[McCarthy] Failed to post draft for review:', error)
    }
  }

  /**
   * Approve AI task draft
   */
  async approveDraft(draftId: string, staffId: string): Promise<boolean> {
    try {
      await this.env.DB.prepare(`
        UPDATE ai_task_drafts 
        SET status = 'approved', approved_by = ?, approved_at = ?
        WHERE id = ?
      `).bind(staffId, new Date().toISOString(), draftId).run()
      
      console.log(`[McCarthy] Draft ${draftId} approved by ${staffId}`)
      return true
    } catch (error) {
      console.error('[McCarthy] Failed to approve draft:', error)
      return false
    }
  }

  /**
   * Reject AI task draft
   */
  async rejectDraft(draftId: string, staffId: string, reason?: string): Promise<boolean> {
    try {
      await this.env.DB.prepare(`
        UPDATE ai_task_drafts 
        SET status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ?
        WHERE id = ?
      `).bind(staffId, new Date().toISOString(), reason || null, draftId).run()
      
      console.log(`[McCarthy] Draft ${draftId} rejected by ${staffId}`)
      return true
    } catch (error) {
      console.error('[McCarthy] Failed to reject draft:', error)
      return false
    }
  }
}

