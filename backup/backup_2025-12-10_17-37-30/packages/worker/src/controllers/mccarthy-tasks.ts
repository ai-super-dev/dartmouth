/**
 * McCarthy AI Task Controllers
 * Handles AI task execution with approval workflow
 */

import { Context } from 'hono'
import { Env, AuthUser } from '../types'
import { McCarthyTaskHandler } from '../services/McCarthyTaskHandler'

/**
 * Generate AI draft for a task
 * POST /api/tasks/:id/generate-draft
 */
export async function generateTaskDraft(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser
    const ticketId = c.req.param('id')
    
    // Get task
    const task = await c.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, description, status, priority, assigned_to, sla_due_at, created_at
      FROM tickets
      WHERE ticket_id = ? AND channel = 'task'
    `).bind(ticketId).first()
    
    if (!task) {
      return c.json({ error: 'Task not found' }, 404)
    }
    
    // Generate draft
    const handler = new McCarthyTaskHandler(c.env)
    const draft = await handler.generateTaskDraft(task as any)
    
    if (!draft) {
      return c.json({ error: 'Failed to generate draft' }, 500)
    }
    
    return c.json({ draft })
  } catch (error) {
    console.error('[McCarthy] Generate draft error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Get AI drafts for a task
 * GET /api/tasks/:id/drafts
 */
export async function getTaskDrafts(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id')
    
    const { results: drafts } = await c.env.DB.prepare(`
      SELECT * FROM ai_task_drafts
      WHERE ticket_id = ?
      ORDER BY created_at DESC
    `).bind(ticketId).all()
    
    return c.json({ drafts })
  } catch (error) {
    console.error('[McCarthy] Get drafts error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Approve AI draft
 * POST /api/tasks/drafts/:id/approve
 */
export async function approveDraft(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser
    const draftId = c.req.param('id')
    
    const handler = new McCarthyTaskHandler(c.env)
    const success = await handler.approveDraft(draftId, user.id)
    
    if (!success) {
      return c.json({ error: 'Failed to approve draft' }, 500)
    }
    
    return c.json({ message: 'Draft approved' })
  } catch (error) {
    console.error('[McCarthy] Approve draft error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Reject AI draft
 * POST /api/tasks/drafts/:id/reject
 * Body: { reason?: string }
 */
export async function rejectDraft(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser
    const draftId = c.req.param('id')
    const body = await c.req.json()
    const { reason } = body
    
    const handler = new McCarthyTaskHandler(c.env)
    const success = await handler.rejectDraft(draftId, user.id, reason)
    
    if (!success) {
      return c.json({ error: 'Failed to reject draft' }, 500)
    }
    
    return c.json({ message: 'Draft rejected' })
  } catch (error) {
    console.error('[McCarthy] Reject draft error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

