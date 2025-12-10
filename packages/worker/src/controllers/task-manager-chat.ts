/**
 * Task Manager Chat Controller
 * Handles API endpoints for Task Manager AI conversations
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import { TaskManagerAIServiceV2 } from '../services/TaskManagerAIServiceV2';

/**
 * Send a message to Task Manager AI
 */
export async function sendMessage(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { message, conversationId, contextType, contextId } = body;

    if (!message || !message.trim()) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }

    // Get staff info
    const staff = await c.env.DB.prepare(`
      SELECT id, first_name, last_name FROM staff WHERE id = ?
    `).bind(user.id).first();

    if (!staff) {
      return c.json({ success: false, error: 'Staff not found' }, 404);
    }

    const staffName = `${staff.first_name} ${staff.last_name}`;

    // Initialize Task Manager AI service V2 (with VectorRAG)
    const taskManagerAI = new TaskManagerAIServiceV2(c.env);

    // Process the message
    const response = await taskManagerAI.processMessage(
      {
        tenantId: user.tenantId,
        staffId: user.id,
        staffName,
        conversationId,
        contextType,
        contextId,
      },
      message.trim()
    );

    return c.json({
      success: true,
      response: {
        message: response.message,
        sessionId: response.sessionId,
        metadata: response.metadata,
      },
    });
  } catch (error: any) {
    console.error('Error sending message to Task Manager AI:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to process message' },
      500
    );
  }
}

/**
 * Get conversation history
 */
export async function getConversation(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify conversation belongs to user
    const conversation = await c.env.DB.prepare(`
      SELECT * FROM task_manager_conversations
      WHERE id = ? AND staff_id = ?
    `).bind(conversationId, user.id).first();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    // Get messages
    const { results: messages } = await c.env.DB.prepare(`
      SELECT 
        m.*,
        s.first_name,
        s.last_name
      FROM task_manager_messages m
      LEFT JOIN staff s ON m.sender_id = s.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `).bind(conversationId).all();

    return c.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error: any) {
    console.error('Error getting conversation:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to get conversation' },
      500
    );
  }
}

/**
 * List all conversations for current user
 */
export async function listConversations(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');

    const { results: conversations } = await c.env.DB.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM task_manager_messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM task_manager_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM task_manager_conversations c
      WHERE c.staff_id = ? AND c.is_active = 1
      ORDER BY c.updated_at DESC
    `).bind(user.id).all();

    return c.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error('Error listing conversations:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to list conversations' },
      500
    );
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { title, contextType, contextId } = body;

    const conversationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO task_manager_conversations (
        id, tenant_id, staff_id, title, context_type, context_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      conversationId,
      user.tenantId,
      user.id,
      title || 'New Conversation',
      contextType || 'general',
      contextId || null,
      now,
      now
    ).run();

    const conversation = await c.env.DB.prepare(`
      SELECT * FROM task_manager_conversations WHERE id = ?
    `).bind(conversationId).first();

    return c.json({
      success: true,
      conversation,
    }, 201);
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to create conversation' },
      500
    );
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify conversation belongs to user
    const conversation = await c.env.DB.prepare(`
      SELECT * FROM task_manager_conversations
      WHERE id = ? AND staff_id = ?
    `).bind(conversationId, user.id).first();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE task_manager_conversations
      SET is_active = 0
      WHERE id = ?
    `).bind(conversationId).run();

    return c.json({
      success: true,
      message: 'Conversation archived',
    });
  } catch (error: any) {
    console.error('Error archiving conversation:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to archive conversation' },
      500
    );
  }
}

/**
 * Execute an action suggested by Task Manager AI
 */
export async function executeAction(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const actionId = c.req.param('id');
    const body = await c.req.json();

    const { confirmed } = body;

    // TODO: Implement action execution with new agent architecture
    // For now, return not implemented
    return c.json({
      success: false,
      error: 'Action execution not yet implemented in V2',
    }, 501);

    return c.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error executing action:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to execute action' },
      500
    );
  }
}

/**
 * Get pending actions for a conversation
 */
export async function getPendingActions(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify conversation belongs to user
    const conversation = await c.env.DB.prepare(`
      SELECT * FROM task_manager_conversations
      WHERE id = ? AND staff_id = ?
    `).bind(conversationId, user.id).first();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    const { results: actions } = await c.env.DB.prepare(`
      SELECT * FROM task_manager_actions
      WHERE conversation_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).bind(conversationId).all();

    return c.json({
      success: true,
      actions,
    });
  } catch (error: any) {
    console.error('Error getting pending actions:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to get pending actions' },
      500
    );
  }
}

/**
 * Get quick suggestions
 */
export async function getQuickSuggestions(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');

    // Get some context-aware suggestions
    const { results: myTasks } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE tenant_id = ? AND assigned_to = ? AND status != 'completed'
    `).bind(user.tenantId, user.id).all();

    const { results: overdue } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE tenant_id = ? AND due_date < datetime('now') AND status != 'completed'
    `).bind(user.tenantId).all();

    const suggestions = [
      'Show my tasks',
      'What tasks are due today?',
      'Create a new task',
      'Show team workload',
    ];

    if (overdue && overdue[0] && (overdue[0] as any).count > 0) {
      suggestions.unshift('What tasks are overdue?');
    }

    return c.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to get suggestions' },
      500
    );
  }
}

