/**
 * Tasks Controller
 * Handles internal task management
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';

/**
 * List all tasks
 */
export async function listTasks(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;

    // Query parameters for filtering
    const status = c.req.query('status');
    const assignedTo = c.req.query('assigned_to');
    const createdBy = c.req.query('created_by');
    const priority = c.req.query('priority');
    const relatedTicket = c.req.query('related_ticket_id');

    let query = `
      SELECT 
        t.*,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name
      FROM tasks t
      LEFT JOIN staff creator ON t.created_by = creator.id
      LEFT JOIN staff assignee ON t.assigned_to = assignee.id
      WHERE t.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (assignedTo) {
      query += ' AND t.assigned_to = ?';
      params.push(assignedTo);
    }

    if (createdBy) {
      query += ' AND t.created_by = ?';
      params.push(createdBy);
    }

    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    if (relatedTicket) {
      query += ' AND t.related_ticket_id = ?';
      params.push(relatedTicket);
    }

    query += ' ORDER BY t.created_at DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      tasks: results,
    });
  } catch (error: any) {
    console.error('Error listing tasks:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to list tasks' },
      500
    );
  }
}

/**
 * Get a single task
 */
export async function getTask(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const taskId = c.req.param('id');

    const task = await c.env.DB.prepare(`
      SELECT 
        t.*,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name
      FROM tasks t
      LEFT JOIN staff creator ON t.created_by = creator.id
      LEFT JOIN staff assignee ON t.assigned_to = assignee.id
      WHERE t.id = ? AND t.tenant_id = ?
    `).bind(taskId, tenantId).first();

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    // Get mentions
    const { results: mentions } = await c.env.DB.prepare(`
      SELECT tm.*, s.first_name, s.last_name, s.email
      FROM task_mentions tm
      LEFT JOIN staff s ON tm.staff_id = s.id
      WHERE tm.task_id = ?
    `).bind(taskId).all();

    // Get comments
    const { results: comments } = await c.env.DB.prepare(`
      SELECT tc.*, s.first_name, s.last_name
      FROM task_comments tc
      LEFT JOIN staff s ON tc.staff_id = s.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).bind(taskId).all();

    // Get activity
    const { results: activity } = await c.env.DB.prepare(`
      SELECT ta.*, s.first_name, s.last_name
      FROM task_activity ta
      LEFT JOIN staff s ON ta.staff_id = s.id
      WHERE ta.task_id = ?
      ORDER BY ta.created_at DESC
    `).bind(taskId).all();

    return c.json({
      success: true,
      task: {
        ...task,
        mentions,
        comments,
        activity,
      },
    });
  } catch (error: any) {
    console.error('Error getting task:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to get task' },
      500
    );
  }
}

/**
 * Create a new task
 */
export async function createTask(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const body = await c.req.json();

    const {
      title,
      description,
      priority = 'normal',
      due_date,
      assigned_to,
      channel_id,
      mentions = [],
      related_ticket_id,
    } = body;

    if (!title || !title.trim()) {
      return c.json({ success: false, error: 'Task title is required' }, 400);
    }

    // Generate task number (TSK-001, TSK-002, etc.)
    const { results: lastTask } = await c.env.DB.prepare(`
      SELECT task_number FROM tasks 
      WHERE tenant_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(tenantId).all();

    let taskNumber = 'TSK-001';
    if (lastTask && lastTask.length > 0) {
      const lastNumber = parseInt(lastTask[0].task_number.split('-')[1]);
      taskNumber = `TSK-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create task
    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, tenant_id, task_number, title, description, 
        status, priority, created_by, assigned_to, 
        due_date, channel_id, related_ticket_id, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      tenantId,
      taskNumber,
      title.trim(),
      description?.trim() || null,
      'pending',
      priority,
      user.id,
      assigned_to || null,
      due_date || null,
      channel_id || null,
      related_ticket_id || null,
      now,
      now
    ).run();

    // Add mentions
    if (mentions && mentions.length > 0) {
      for (const mentionId of mentions) {
        const mentionType = mentionId.startsWith('@') ? mentionId : 'direct';
        
        // If it's a special mention (@all, @managers, @admins), we'll handle it differently
        if (mentionId.startsWith('@')) {
          await c.env.DB.prepare(`
            INSERT INTO task_mentions (id, task_id, staff_id, mention_type, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            uuidv4(),
            taskId,
            mentionId, // Store the special mention as staff_id for now
            mentionType,
            now
          ).run();
        } else {
          // Regular staff mention
          await c.env.DB.prepare(`
            INSERT INTO task_mentions (id, task_id, staff_id, mention_type, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            uuidv4(),
            taskId,
            mentionId,
            'direct',
            now
          ).run();
        }
      }
    }

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO task_activity (id, task_id, staff_id, action, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      uuidv4(),
      taskId,
      user.id,
      'created',
      JSON.stringify({ title, priority, assigned_to }),
      now
    ).run();

    // Get the created task
    const task = await c.env.DB.prepare(`
      SELECT 
        t.*,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name
      FROM tasks t
      LEFT JOIN staff creator ON t.created_by = creator.id
      LEFT JOIN staff assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `).bind(taskId).first();

    return c.json({
      success: true,
      task,
    }, 201);
  } catch (error: any) {
    console.error('Error creating task:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to create task' },
      500
    );
  }
}

/**
 * Update a task
 */
export async function updateTask(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const taskId = c.req.param('id');
    const body = await c.req.json();

    const {
      title,
      description,
      status,
      priority,
      assigned_to,
      due_date,
    } = body;

    // Verify task exists and belongs to tenant
    const existingTask = await c.env.DB.prepare(`
      SELECT * FROM tasks WHERE id = ? AND tenant_id = ?
    `).bind(taskId, tenantId).first();

    if (!existingTask) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description?.trim() || null);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);

      // If completing the task, set completed_at
      if (status === 'completed') {
        updates.push('completed_at = ?');
        params.push(now);
      }
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to || null);
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date || null);
    }

    updates.push('updated_at = ?');
    params.push(now);

    params.push(taskId, tenantId);

    await c.env.DB.prepare(`
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...params).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO task_activity (id, task_id, staff_id, action, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      uuidv4(),
      taskId,
      user.id,
      'updated',
      JSON.stringify(body),
      now
    ).run();

    // Get updated task
    const task = await c.env.DB.prepare(`
      SELECT 
        t.*,
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name
      FROM tasks t
      LEFT JOIN staff creator ON t.created_by = creator.id
      LEFT JOIN staff assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `).bind(taskId).first();

    return c.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to update task' },
      500
    );
  }
}

/**
 * Delete a task
 */
export async function deleteTask(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const taskId = c.req.param('id');

    // Verify task exists and belongs to tenant
    const task = await c.env.DB.prepare(`
      SELECT * FROM tasks WHERE id = ? AND tenant_id = ?
    `).bind(taskId, tenantId).first();

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    // Delete task (cascade will handle mentions, comments, activity)
    await c.env.DB.prepare(`
      DELETE FROM tasks WHERE id = ? AND tenant_id = ?
    `).bind(taskId, tenantId).run();

    return c.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to delete task' },
      500
    );
  }
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const taskId = c.req.param('id');
    const body = await c.req.json();

    const { content } = body;

    if (!content || !content.trim()) {
      return c.json({ success: false, error: 'Comment content is required' }, 400);
    }

    // Verify task exists and belongs to tenant
    const task = await c.env.DB.prepare(`
      SELECT * FROM tasks WHERE id = ? AND tenant_id = ?
    `).bind(taskId, tenantId).first();

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    const commentId = uuidv4();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO task_comments (id, task_id, staff_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      commentId,
      taskId,
      user.id,
      content.trim(),
      now,
      now
    ).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO task_activity (id, task_id, staff_id, action, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      uuidv4(),
      taskId,
      user.id,
      'commented',
      JSON.stringify({ comment: content.trim() }),
      now
    ).run();

    // Get the comment with staff info
    const comment = await c.env.DB.prepare(`
      SELECT tc.*, s.first_name, s.last_name
      FROM task_comments tc
      LEFT JOIN staff s ON tc.staff_id = s.id
      WHERE tc.id = ?
    `).bind(commentId).first();

    return c.json({
      success: true,
      comment,
    }, 201);
  } catch (error: any) {
    console.error('Error adding task comment:', error);
    return c.json(
      { success: false, error: error.message || 'Failed to add comment' },
      500
    );
  }
}

