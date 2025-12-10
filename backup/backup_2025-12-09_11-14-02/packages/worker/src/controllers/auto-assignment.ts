/**
 * Auto-Assignment Controller
 * 
 * API endpoints for managing auto-assignment configuration
 */

import { Context } from 'hono';
import { AutoAssignmentService } from '../services/AutoAssignmentService';

interface Env {
  DB: D1Database;
}

/**
 * Get auto-assignment configuration
 */
export async function getConfig(c: Context<{ Bindings: Env }>) {
  try {
    const service = new AutoAssignmentService(c.env.DB);
    const config = await service.getConfig();

    if (!config) {
      return c.json({
        success: false,
        error: 'Configuration not found',
      }, 404);
    }

    // Parse channels into array for frontend
    return c.json({
      success: true,
      config: {
        enabled: config.enabled === 1,
        maxAssignedTickets: config.max_assigned_tickets,
        refillThreshold: config.refill_threshold,
        priorityOrder: config.priority_order,
        channels: config.channels.split(',').map(c => c.trim()),
        businessHoursOnly: config.business_hours_only === 1,
      },
    });
  } catch (error) {
    console.error('Error getting auto-assignment config:', error);
    return c.json({
      success: false,
      error: 'Failed to get configuration',
    }, 500);
  }
}

/**
 * Update auto-assignment configuration
 */
export async function updateConfig(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const service = new AutoAssignmentService(c.env.DB);

    const updates: any = {};
    
    if (body.enabled !== undefined) {
      updates.enabled = body.enabled ? 1 : 0;
    }
    if (body.maxAssignedTickets !== undefined) {
      updates.max_assigned_tickets = parseInt(body.maxAssignedTickets);
    }
    if (body.refillThreshold !== undefined) {
      updates.refill_threshold = parseInt(body.refillThreshold);
    }
    if (body.priorityOrder !== undefined) {
      updates.priority_order = body.priorityOrder;
    }
    if (body.channels !== undefined) {
      updates.channels = Array.isArray(body.channels) 
        ? body.channels.join(',') 
        : body.channels;
    }
    if (body.businessHoursOnly !== undefined) {
      updates.business_hours_only = body.businessHoursOnly ? 1 : 0;
    }

    const success = await service.updateConfig(updates);

    if (!success) {
      return c.json({
        success: false,
        error: 'Failed to update configuration',
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating auto-assignment config:', error);
    return c.json({
      success: false,
      error: 'Failed to update configuration',
    }, 500);
  }
}

/**
 * Manually trigger auto-assignment (admin only)
 */
export async function runNow(c: Context<{ Bindings: Env }>) {
  try {
    const service = new AutoAssignmentService(c.env.DB);
    const result = await service.runAutoAssignment();

    return c.json({
      success: true,
      message: `Auto-assignment completed: ${result.assigned} tickets assigned`,
      assigned: result.assigned,
      results: result.results,
    });
  } catch (error) {
    console.error('Error running auto-assignment:', error);
    return c.json({
      success: false,
      error: 'Failed to run auto-assignment',
    }, 500);
  }
}

/**
 * Get assignment history/audit log
 */
export async function getHistory(c: Context<{ Bindings: Env }>) {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const service = new AutoAssignmentService(c.env.DB);
    const history = await service.getAssignmentHistory(limit);

    return c.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error getting assignment history:', error);
    return c.json({
      success: false,
      error: 'Failed to get history',
    }, 500);
  }
}

/**
 * Update staff auto-assignment settings
 */
export async function updateStaffSettings(c: Context<{ Bindings: Env }>) {
  try {
    const staffId = c.req.param('staffId');
    const body = await c.req.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.autoAssignEnabled !== undefined) {
      updates.push('auto_assign_enabled = ?');
      values.push(body.autoAssignEnabled ? 1 : 0);
    }
    if (body.autoAssignMax !== undefined) {
      updates.push('auto_assign_max = ?');
      values.push(body.autoAssignMax || null);
    }
    if (body.autoAssignChannels !== undefined) {
      updates.push('auto_assign_channels = ?');
      values.push(body.autoAssignChannels ? body.autoAssignChannels.join(',') : null);
    }

    if (updates.length === 0) {
      return c.json({ success: true, message: 'No changes' });
    }

    values.push(staffId);
    await c.env.DB.prepare(`
      UPDATE staff_users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return c.json({
      success: true,
      message: 'Staff settings updated',
    });
  } catch (error) {
    console.error('Error updating staff settings:', error);
    return c.json({
      success: false,
      error: 'Failed to update staff settings',
    }, 500);
  }
}

/**
 * Get staff auto-assignment settings
 */
export async function getStaffSettings(c: Context<{ Bindings: Env }>) {
  try {
    const staffId = c.req.param('staffId');

    const result = await c.env.DB.prepare(`
      SELECT 
        id,
        first_name,
        last_name,
        auto_assign_enabled,
        auto_assign_max,
        auto_assign_channels
      FROM staff_users WHERE id = ?
    `).bind(staffId).first();

    if (!result) {
      return c.json({
        success: false,
        error: 'Staff member not found',
      }, 404);
    }

    return c.json({
      success: true,
      settings: {
        id: result.id,
        firstName: result.first_name,
        lastName: result.last_name,
        autoAssignEnabled: result.auto_assign_enabled === 1,
        autoAssignMax: result.auto_assign_max,
        autoAssignChannels: result.auto_assign_channels 
          ? (result.auto_assign_channels as string).split(',') 
          : null,
      },
    });
  } catch (error) {
    console.error('Error getting staff settings:', error);
    return c.json({
      success: false,
      error: 'Failed to get staff settings',
    }, 500);
  }
}

