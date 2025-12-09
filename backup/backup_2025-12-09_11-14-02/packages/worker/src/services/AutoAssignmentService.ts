/**
 * Auto-Assignment Service
 * 
 * Hybrid model for automatic ticket assignment:
 * - Auto-assigns tickets to online staff during business hours
 * - Respects max ticket caps and refill thresholds
 * - Round-robin distribution by lowest ticket count
 * - Priority-aware assignment (high priority first)
 * - Per-staff opt-out support
 */

import type { D1Database } from '@cloudflare/workers-types';

interface AutoAssignConfig {
  id: string;
  enabled: number;
  max_assigned_tickets: number;
  refill_threshold: number;
  priority_order: 'priority_first' | 'oldest_first' | 'newest_first';
  channels: string;
  business_hours_only: number;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  availability_status: string;
  auto_assign_enabled: number;
  auto_assign_max: number | null;
  auto_assign_channels: string | null;
  current_ticket_count: number;
}

interface UnassignedTicket {
  ticket_id: string;
  ticket_number: string;
  channel: string;
  priority: string;
  created_at: string;
}

interface AssignmentResult {
  ticketId: string;
  ticketNumber: string;
  assignedTo: string;
  staffName: string;
  reason: string;
}

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<string, number> = {
  'critical': 5,
  'urgent': 4,
  'high': 3,
  'normal': 2,
  'low': 1,
};

export class AutoAssignmentService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Run the auto-assignment job
   * Called by cron every 5 minutes
   */
  async runAutoAssignment(): Promise<{ assigned: number; results: AssignmentResult[] }> {
    console.log('[AutoAssignment] Starting auto-assignment job...');
    
    // 1. Check if auto-assignment is enabled
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      console.log('[AutoAssignment] Auto-assignment is disabled');
      return { assigned: 0, results: [] };
    }

    // 2. Check business hours if required
    if (config.business_hours_only) {
      const isWithinHours = await this.isWithinBusinessHours();
      if (!isWithinHours) {
        console.log('[AutoAssignment] Outside business hours, skipping');
        return { assigned: 0, results: [] };
      }
    }

    // 3. Get eligible staff (online, auto-assign enabled, below threshold)
    const eligibleStaff = await this.getEligibleStaff(config);
    if (eligibleStaff.length === 0) {
      console.log('[AutoAssignment] No eligible staff found');
      return { assigned: 0, results: [] };
    }

    console.log(`[AutoAssignment] Found ${eligibleStaff.length} eligible staff`);

    // 4. Get unassigned tickets
    const channels = config.channels.split(',').map(c => c.trim());
    const unassignedTickets = await this.getUnassignedTickets(channels, config.priority_order);
    if (unassignedTickets.length === 0) {
      console.log('[AutoAssignment] No unassigned tickets');
      return { assigned: 0, results: [] };
    }

    console.log(`[AutoAssignment] Found ${unassignedTickets.length} unassigned tickets`);

    // 5. Assign tickets to staff
    const results: AssignmentResult[] = [];
    const now = new Date().toISOString();

    for (const ticket of unassignedTickets) {
      // Find staff member who needs tickets (below threshold, has capacity)
      const staffToAssign = this.findStaffToAssign(eligibleStaff, config, ticket.channel);
      
      if (!staffToAssign) {
        console.log(`[AutoAssignment] No available staff for ticket ${ticket.ticket_number}`);
        continue;
      }

      // Assign the ticket
      await this.assignTicket(ticket.ticket_id, staffToAssign.id, now);
      
      // Update staff's ticket count in memory
      staffToAssign.current_ticket_count++;

      // Log the assignment
      const reason = staffToAssign.current_ticket_count <= config.refill_threshold 
        ? 'auto_refill' 
        : 'initial_assignment';
      
      await this.logAssignment(ticket.ticket_id, ticket.ticket_number, staffToAssign.id, reason, staffToAssign.current_ticket_count);

      results.push({
        ticketId: ticket.ticket_id,
        ticketNumber: ticket.ticket_number,
        assignedTo: staffToAssign.id,
        staffName: `${staffToAssign.first_name} ${staffToAssign.last_name || ''}`.trim(),
        reason,
      });

      console.log(`[AutoAssignment] Assigned ${ticket.ticket_number} to ${staffToAssign.first_name} (now has ${staffToAssign.current_ticket_count} tickets)`);
    }

    console.log(`[AutoAssignment] Completed: ${results.length} tickets assigned`);
    return { assigned: results.length, results };
  }

  /**
   * Get auto-assignment configuration
   */
  async getConfig(): Promise<AutoAssignConfig | null> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM auto_assignment_config WHERE id = 'default'
      `).first<AutoAssignConfig>();
      return result || null;
    } catch (error) {
      console.error('[AutoAssignment] Error getting config:', error);
      return null;
    }
  }

  /**
   * Update auto-assignment configuration
   */
  async updateConfig(updates: Partial<AutoAssignConfig>): Promise<boolean> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(updates.enabled);
      }
      if (updates.max_assigned_tickets !== undefined) {
        fields.push('max_assigned_tickets = ?');
        values.push(updates.max_assigned_tickets);
      }
      if (updates.refill_threshold !== undefined) {
        fields.push('refill_threshold = ?');
        values.push(updates.refill_threshold);
      }
      if (updates.priority_order !== undefined) {
        fields.push('priority_order = ?');
        values.push(updates.priority_order);
      }
      if (updates.channels !== undefined) {
        fields.push('channels = ?');
        values.push(updates.channels);
      }
      if (updates.business_hours_only !== undefined) {
        fields.push('business_hours_only = ?');
        values.push(updates.business_hours_only);
      }

      if (fields.length === 0) return true;

      values.push('default');
      await this.db.prepare(`
        UPDATE auto_assignment_config SET ${fields.join(', ')} WHERE id = ?
      `).bind(...values).run();

      return true;
    } catch (error) {
      console.error('[AutoAssignment] Error updating config:', error);
      return false;
    }
  }

  /**
   * Check if current time is within business hours
   */
  private async isWithinBusinessHours(): Promise<boolean> {
    try {
      const dayOfWeek = new Date().getDay();
      const result = await this.db.prepare(`
        SELECT is_open, open_time, close_time FROM business_hours WHERE day_of_week = ?
      `).bind(dayOfWeek).first<{ is_open: number; open_time: string; close_time: string }>();

      if (!result || !result.is_open) return false;

      // Get current time in configured timezone
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      return currentTime >= result.open_time && currentTime <= result.close_time;
    } catch (error) {
      console.error('[AutoAssignment] Error checking business hours:', error);
      return true; // Default to allowing assignment if check fails
    }
  }

  /**
   * Get staff eligible for auto-assignment
   */
  private async getEligibleStaff(config: AutoAssignConfig): Promise<StaffMember[]> {
    try {
      // Get online staff with their current open ticket counts
      const { results } = await this.db.prepare(`
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.availability_status,
          COALESCE(s.auto_assign_enabled, 1) as auto_assign_enabled,
          s.auto_assign_max,
          s.auto_assign_channels,
          COUNT(CASE WHEN t.status IN ('open', 'in-progress') AND t.deleted_at IS NULL THEN 1 END) as current_ticket_count
        FROM staff_users s
        LEFT JOIN tickets t ON t.assigned_to = s.id
        WHERE s.availability_status = 'online'
          AND s.id != 'ai-agent-001'
          AND COALESCE(s.auto_assign_enabled, 1) = 1
          AND s.role IN ('admin', 'agent')
        GROUP BY s.id
        HAVING current_ticket_count < COALESCE(s.auto_assign_max, ?)
        ORDER BY current_ticket_count ASC
      `).bind(config.max_assigned_tickets).all<StaffMember>();

      // Filter to only those below refill threshold or with capacity
      return results.filter(staff => {
        const maxTickets = staff.auto_assign_max || config.max_assigned_tickets;
        return staff.current_ticket_count < maxTickets;
      });
    } catch (error) {
      console.error('[AutoAssignment] Error getting eligible staff:', error);
      return [];
    }
  }

  /**
   * Get unassigned tickets for specified channels
   */
  private async getUnassignedTickets(channels: string[], priorityOrder: string): Promise<UnassignedTicket[]> {
    try {
      const channelPlaceholders = channels.map(() => '?').join(',');
      
      let orderBy = 'created_at ASC'; // oldest first (default)
      if (priorityOrder === 'priority_first') {
        orderBy = `
          CASE priority 
            WHEN 'critical' THEN 1 
            WHEN 'urgent' THEN 2 
            WHEN 'high' THEN 3 
            WHEN 'normal' THEN 4 
            WHEN 'low' THEN 5 
          END ASC, created_at ASC
        `;
      } else if (priorityOrder === 'newest_first') {
        orderBy = 'created_at DESC';
      }

      const { results } = await this.db.prepare(`
        SELECT ticket_id, ticket_number, channel, priority, created_at
        FROM tickets
        WHERE assigned_to IS NULL
          AND status = 'open'
          AND deleted_at IS NULL
          AND channel IN (${channelPlaceholders})
        ORDER BY ${orderBy}
        LIMIT 50
      `).bind(...channels).all<UnassignedTicket>();

      return results;
    } catch (error) {
      console.error('[AutoAssignment] Error getting unassigned tickets:', error);
      return [];
    }
  }

  /**
   * Find the best staff member to assign a ticket to
   * Uses round-robin by lowest ticket count, respecting thresholds
   */
  private findStaffToAssign(staff: StaffMember[], config: AutoAssignConfig, channel: string): StaffMember | null {
    // Filter staff who can handle this channel
    const eligibleForChannel = staff.filter(s => {
      const staffChannels = s.auto_assign_channels || config.channels;
      return staffChannels.includes(channel);
    });

    if (eligibleForChannel.length === 0) return null;

    // Prioritize staff below refill threshold
    const belowThreshold = eligibleForChannel.filter(s => 
      s.current_ticket_count < config.refill_threshold
    );

    if (belowThreshold.length > 0) {
      // Return staff with lowest count (already sorted)
      return belowThreshold[0];
    }

    // Otherwise, find staff with capacity (below max)
    const withCapacity = eligibleForChannel.filter(s => {
      const maxTickets = s.auto_assign_max || config.max_assigned_tickets;
      return s.current_ticket_count < maxTickets;
    });

    if (withCapacity.length > 0) {
      return withCapacity[0];
    }

    return null;
  }

  /**
   * Assign a ticket to a staff member
   */
  private async assignTicket(ticketId: string, staffId: string, timestamp: string): Promise<void> {
    await this.db.prepare(`
      UPDATE tickets 
      SET assigned_to = ?, status = 'in-progress', updated_at = ?
      WHERE ticket_id = ?
    `).bind(staffId, timestamp, ticketId).run();
  }

  /**
   * Log an auto-assignment for audit
   */
  private async logAssignment(
    ticketId: string, 
    ticketNumber: string, 
    assignedTo: string, 
    reason: string, 
    staffTicketCount: number
  ): Promise<void> {
    const logId = `alog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    await this.db.prepare(`
      INSERT INTO auto_assignment_log (id, ticket_id, ticket_number, assigned_to, reason, staff_ticket_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(logId, ticketId, ticketNumber, assignedTo, reason, staffTicketCount).run();
  }

  /**
   * Get assignment history for audit
   */
  async getAssignmentHistory(limit: number = 50): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(`
        SELECT 
          l.*,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name
        FROM auto_assignment_log l
        LEFT JOIN staff_users s ON l.assigned_to = s.id
        ORDER BY l.assigned_at DESC
        LIMIT ?
      `).bind(limit).all();

      return results;
    } catch (error) {
      console.error('[AutoAssignment] Error getting history:', error);
      return [];
    }
  }
}

