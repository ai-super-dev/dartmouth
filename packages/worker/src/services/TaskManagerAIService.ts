/**
 * Task Manager AI Service
 * Handles conversations between staff and the Task Manager AI assistant
 */

import type { Env } from '../types/shared';

interface TaskManagerContext {
  tenantId: string;
  staffId: string;
  staffName: string;
  conversationId?: string;
  contextType?: 'general' | 'task' | 'project';
  contextId?: string;
}

interface TaskManagerResponse {
  message: string;
  actions?: Array<{
    type: string;
    data: any;
    requiresConfirmation: boolean;
  }>;
  suggestions?: string[];
  metadata?: any;
}

export class TaskManagerAIService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Process a message from staff to Task Manager AI
   */
  async processMessage(
    context: TaskManagerContext,
    message: string
  ): Promise<TaskManagerResponse> {
    try {
      // Get or create conversation
      const conversationId = context.conversationId || await this.createConversation(context);

      // Get conversation history
      const history = await this.getConversationHistory(conversationId);

      // Build context for AI
      const systemMessage = await this.buildSystemMessage(context);
      const contextData = await this.gatherContext(context);

      // Prepare messages for AI
      const messagesText = [
        `System: ${systemMessage}`,
        `Context: ${JSON.stringify(contextData, null, 2)}`,
        ...history.map((msg: any) => 
          `${msg.sender_type === 'staff' ? 'User' : 'Assistant'}: ${msg.content}`
        ),
        `User: ${message}`,
      ].join('\n\n');

      // Call Workers AI (Llama)
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'system', content: `Current Context:\n${JSON.stringify(contextData, null, 2)}` },
          ...history.map((msg: any) => ({
            role: msg.sender_type === 'staff' ? 'user' : 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: message },
        ],
      }) as any;

      const responseContent = response.response || '';

      // Store staff message
      await this.storeMessage(conversationId, 'staff', context.staffId, message);

      // Parse actions from response (simple keyword matching for now)
      const actions: any[] = [];
      const lowerResponse = responseContent.toLowerCase();
      
      if (lowerResponse.includes('create task') || lowerResponse.includes('new task')) {
        // Extract task details from response if possible
        actions.push({
          type: 'create_task',
          data: { title: 'New task from conversation' },
          requiresConfirmation: true,
        });
      }

      // Store AI response
      const aiMessageId = await this.storeMessage(
        conversationId,
        'task_manager_ai',
        null,
        responseContent,
        actions.length > 0 ? 'action_suggested' : 'message',
        actions.length > 0 ? JSON.stringify(actions) : null
      );

      // Log actions
      for (const action of actions) {
        await this.logAction(conversationId, aiMessageId, action);
      }

      return {
        message: responseContent,
        actions,
        suggestions: this.generateSuggestions(context),
        metadata: {
          conversationId,
          messageId: aiMessageId,
        },
      };
    } catch (error: any) {
      console.error('Error processing Task Manager AI message:', error);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  /**
   * Execute an action suggested by Task Manager AI
   */
  async executeAction(
    actionId: string,
    staffId: string,
    confirmed: boolean = false
  ): Promise<any> {
    try {
      // Get action details
      const action = await this.env.DB.prepare(`
        SELECT * FROM task_manager_actions WHERE id = ?
      `).bind(actionId).first();

      if (!action) {
        throw new Error('Action not found');
      }

      if (action.status !== 'pending') {
        throw new Error('Action already processed');
      }

      if (action.requires_confirmation && !confirmed) {
        throw new Error('Action requires confirmation');
      }

      const actionData = JSON.parse(action.action_data);
      let result: any;

      // Execute based on action type
      switch (action.action_type) {
        case 'create_task':
          result = await this.executeCreateTask(actionData, staffId);
          break;
        case 'update_task':
          result = await this.executeUpdateTask(actionData, staffId);
          break;
        case 'assign_task':
          result = await this.executeAssignTask(actionData, staffId);
          break;
        case 'search_tasks':
          result = await this.executeSearchTasks(actionData, staffId);
          break;
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Update action status
      const now = new Date().toISOString();
      await this.env.DB.prepare(`
        UPDATE task_manager_actions
        SET status = 'completed',
            result = ?,
            confirmed_by = ?,
            confirmed_at = ?,
            completed_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(result),
        staffId,
        now,
        now,
        actionId
      ).run();

      return result;
    } catch (error: any) {
      // Update action status to failed
      await this.env.DB.prepare(`
        UPDATE task_manager_actions
        SET status = 'failed',
            result = ?
        WHERE id = ?
      `).bind(
        JSON.stringify({ error: error.message }),
        actionId
      ).run();

      throw error;
    }
  }

  /**
   * Build system message for Task Manager AI
   */
  private async buildSystemMessage(context: TaskManagerContext): Promise<string> {
    // Try to get custom system message from tenant settings
    const customMessage = await this.env.DB.prepare(`
      SELECT value FROM tenant_settings
      WHERE tenant_id = ? AND key = 'task_manager_system_message'
    `).bind(context.tenantId).first();

    if (customMessage?.value) {
      return customMessage.value as string;
    }

    // Default system message
    return `You are the Task Manager AI, an intelligent assistant helping staff coordinate tasks and projects.

Your Role:
- Help staff create, update, and manage tasks
- Provide insights on task status and team workload
- Suggest task assignments based on staff availability and expertise
- Track project progress and deadlines
- Coordinate team collaboration
- Answer questions about tasks and projects

Capabilities:
- Search and filter tasks by any criteria
- Create new tasks with all details
- Update task status, priority, assignments
- Assign tasks to team members
- Provide task summaries and reports
- Track overdue and upcoming tasks
- Suggest task prioritization

Communication Style:
- Professional but friendly
- Concise and action-oriented
- Proactive with suggestions
- Clear about what actions you can take
- Ask for confirmation on important changes

Current Staff: ${context.staffName}

Always be helpful, efficient, and focused on helping the team stay organized and productive.`;
  }

  /**
   * Gather context data for AI
   */
  private async gatherContext(context: TaskManagerContext): Promise<any> {
    const contextData: any = {
      staff: {
        id: context.staffId,
        name: context.staffName,
      },
    };

    // Get staff's tasks
    const { results: myTasks } = await this.env.DB.prepare(`
      SELECT * FROM tasks
      WHERE tenant_id = ? AND assigned_to = ? AND status != 'completed'
      ORDER BY priority DESC, due_date ASC
      LIMIT 10
    `).bind(context.tenantId, context.staffId).all();

    contextData.myTasks = myTasks;

    // Get team tasks
    const { results: teamTasks } = await this.env.DB.prepare(`
      SELECT * FROM tasks
      WHERE tenant_id = ? AND status != 'completed'
      ORDER BY priority DESC, due_date ASC
      LIMIT 20
    `).bind(context.tenantId).all();

    contextData.teamTasks = teamTasks;

    // If context is a specific task, get its details
    if (context.contextId && context.contextType === 'task') {
      const task = await this.env.DB.prepare(`
        SELECT * FROM tasks WHERE id = ?
      `).bind(context.contextId).first();

      contextData.currentTask = task;
    }

    // Get task statistics
    const stats = await this.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN due_date < datetime('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE tenant_id = ?
    `).bind(context.tenantId).first();

    contextData.statistics = stats;

    return contextData;
  }


  /**
   * Check if action requires confirmation
   */
  private requiresConfirmation(actionType: string): boolean {
    const confirmationRequired = [
      'create_task',
      'update_task',
      'assign_task',
      'delete_task',
    ];
    return confirmationRequired.includes(actionType);
  }

  /**
   * Generate quick action suggestions
   */
  private generateSuggestions(context: TaskManagerContext): string[] {
    return [
      'Show my tasks',
      'What tasks are overdue?',
      'Create a new task',
      'Show team workload',
      'What\'s due this week?',
    ];
  }

  /**
   * Create a new conversation
   */
  private async createConversation(context: TaskManagerContext): Promise<string> {
    const conversationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(`
      INSERT INTO task_manager_conversations (
        id, tenant_id, staff_id, context_type, context_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      conversationId,
      context.tenantId,
      context.staffId,
      context.contextType || 'general',
      context.contextId || null,
      now,
      now
    ).run();

    return conversationId;
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(conversationId: string): Promise<any[]> {
    const { results } = await this.env.DB.prepare(`
      SELECT * FROM task_manager_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT 50
    `).bind(conversationId).all();

    return results || [];
  }

  /**
   * Store a message
   */
  private async storeMessage(
    conversationId: string,
    senderType: string,
    senderId: string | null,
    content: string,
    actionType: string = 'message',
    actionData: string | null = null
  ): Promise<string> {
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(`
      INSERT INTO task_manager_messages (
        id, conversation_id, sender_type, sender_id, content, action_type, action_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      conversationId,
      senderType,
      senderId,
      content,
      actionType,
      actionData,
      now
    ).run();

    // Update conversation timestamp
    await this.env.DB.prepare(`
      UPDATE task_manager_conversations
      SET updated_at = ?
      WHERE id = ?
    `).bind(now, conversationId).run();

    return messageId;
  }

  /**
   * Log an action
   */
  private async logAction(
    conversationId: string,
    messageId: string,
    action: any
  ): Promise<string> {
    const actionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(`
      INSERT INTO task_manager_actions (
        id, conversation_id, message_id, action_type, action_data,
        status, requires_confirmation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      actionId,
      conversationId,
      messageId,
      action.type,
      JSON.stringify(action.data),
      'pending',
      action.requiresConfirmation ? 1 : 0,
      now
    ).run();

    return actionId;
  }

  /**
   * Execute create task action
   */
  private async executeCreateTask(data: any, staffId: string): Promise<any> {
    // Get tenant ID from staff
    const staff = await this.env.DB.prepare(`
      SELECT tenant_id FROM staff WHERE id = ?
    `).bind(staffId).first();

    if (!staff) throw new Error('Staff not found');

    // Generate task number
    const { results: lastTask } = await this.env.DB.prepare(`
      SELECT task_number FROM tasks 
      WHERE tenant_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(staff.tenant_id).all();

    let taskNumber = 'TSK-001';
    if (lastTask && lastTask.length > 0) {
      const lastNumber = parseInt((lastTask[0] as any).task_number.split('-')[1]);
      taskNumber = `TSK-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(`
      INSERT INTO tasks (
        id, tenant_id, task_number, title, description,
        status, priority, created_by, assigned_to, due_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      staff.tenant_id,
      taskNumber,
      data.title,
      data.description || null,
      'pending',
      data.priority || 'normal',
      staffId,
      data.assigned_to || null,
      data.due_date || null,
      now,
      now
    ).run();

    return { taskId, taskNumber };
  }

  /**
   * Execute update task action
   */
  private async executeUpdateTask(data: any, staffId: string): Promise<any> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.priority) {
      updates.push('priority = ?');
      params.push(data.priority);
    }
    if (data.assigned_to) {
      updates.push('assigned_to = ?');
      params.push(data.assigned_to);
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);
    params.push(data.task_id);

    await this.env.DB.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return { success: true };
  }

  /**
   * Execute assign task action
   */
  private async executeAssignTask(data: any, staffId: string): Promise<any> {
    const now = new Date().toISOString();

    await this.env.DB.prepare(`
      UPDATE tasks SET assigned_to = ?, updated_at = ? WHERE id = ?
    `).bind(data.staff_id, now, data.task_id).run();

    return { success: true };
  }

  /**
   * Execute search tasks action
   */
  private async executeSearchTasks(data: any, staffId: string): Promise<any> {
    // Get tenant ID
    const staff = await this.env.DB.prepare(`
      SELECT tenant_id FROM staff WHERE id = ?
    `).bind(staffId).first();

    let query = 'SELECT * FROM tasks WHERE tenant_id = ?';
    const params: any[] = [staff?.tenant_id];

    if (data.status) {
      query += ' AND status = ?';
      params.push(data.status);
    }
    if (data.priority) {
      query += ' AND priority = ?';
      params.push(data.priority);
    }
    if (data.assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(data.assigned_to);
    }
    if (data.query) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${data.query}%`, `%${data.query}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT 20';

    const { results } = await this.env.DB.prepare(query).bind(...params).all();

    return { tasks: results };
  }
}

