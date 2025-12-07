import { Context } from 'hono';
import { Env } from '../types/shared';
import { nanoid } from 'nanoid';

/**
 * @Mentions Controller
 * Handles all mention-related operations
 */

// Get all mentions for current user
export async function getMentions(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    // Get query parameters for filtering
    const viewAll = c.req.query('view_all') === 'true';
    const mentionedStaffId = c.req.query('mentioned_staff_id');
    const ticketNumber = c.req.query('ticket_number');
    const channelId = c.req.query('channel_id');
    const mentioningStaffId = c.req.query('mentioning_staff_id');
    const isRead = c.req.query('is_read');
    const timeFilter = c.req.query('time_filter'); // 'hour', '12hours', '24hours'
    const customStartDate = c.req.query('start_date');
    const customEndDate = c.req.query('end_date');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Check if user is admin for view_all
    const isAdmin = user.role === 'admin' || user.role === 'manager';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    // View mode logic
    if (viewAll && isAdmin) {
      // Admin viewing all mentions - no filter on mentioned_staff_id
    } else if (mentionedStaffId) {
      // Viewing mentions for a specific staff member
      conditions.push('m.mentioned_staff_id = ?');
      params.push(mentionedStaffId);
    } else {
      // Default: show mentions for current user
      conditions.push('m.mentioned_staff_id = ?');
      params.push(user.id);
    }

    // Ticket number filter
    if (ticketNumber) {
      conditions.push('m.ticket_number = ?');
      params.push(ticketNumber);
    }

    if (channelId) {
      conditions.push('m.context_id = ?');
      params.push(channelId);
    }

    if (mentioningStaffId) {
      conditions.push('m.mentioning_staff_id = ?');
      params.push(mentioningStaffId);
    }

    if (isRead !== undefined) {
      conditions.push('m.is_read = ?');
      params.push(isRead === 'true' ? 1 : 0);
    }

    // Time filters
    if (timeFilter) {
      const now = new Date();
      let startTime: Date;

      switch (timeFilter) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '12hours':
          startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          break;
        case '24hours':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(0);
      }

      conditions.push('m.created_at >= ?');
      params.push(startTime.toISOString());
    }

    if (customStartDate) {
      conditions.push('m.created_at >= ?');
      params.push(customStartDate);
    }

    if (customEndDate) {
      conditions.push('m.created_at <= ?');
      params.push(customEndDate);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get mentions with staff details
    const query = `
      SELECT 
        m.*,
        s1.first_name as mentioning_first_name,
        s1.last_name as mentioning_last_name,
        s1.email as mentioning_email,
        CASE 
          WHEN m.context_type = 'group_chat' THEN gc.name
          ELSE NULL
        END as channel_name,
        CASE
          WHEN m.context_type = 'group_chat' THEN gcm.content
          WHEN m.context_type = 'ticket_note' THEN notes.content
          ELSE NULL
        END as message_content,
        t.channel as ticket_channel
      FROM mentions m
      LEFT JOIN staff_users s1 ON m.mentioning_staff_id = s1.id
      LEFT JOIN group_chat_channels gc ON m.context_type = 'group_chat' AND m.context_id = gc.id
      LEFT JOIN group_chat_messages gcm ON m.context_type = 'group_chat' AND m.message_id = gcm.id
      LEFT JOIN internal_notes notes ON m.context_type = 'ticket_note' AND m.message_id = notes.id
      LEFT JOIN tickets t ON m.ticket_id = t.ticket_id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    console.log('[Mentions] Query:', query);
    console.log('[Mentions] Params:', params);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    console.log('[Mentions] Found mentions:', results.length);
    console.log('[Mentions] Sample results:', JSON.stringify(results.slice(0, 3), null, 2));

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentions m
      WHERE ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset
    const { results: countResults } = await c.env.DB.prepare(countQuery).bind(...countParams).all();
    const total = (countResults[0] as any)?.total || 0;

    return c.json({
      success: true,
      mentions: results,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Mentions] Error fetching mentions:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Get a specific mention by ID
export async function getMention(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const mentionId = c.req.param('id');

    const query = `
      SELECT 
        m.*,
        s1.first_name as mentioning_first_name,
        s1.last_name as mentioning_last_name,
        s1.email as mentioning_email,
        CASE 
          WHEN m.context_type = 'group_chat' THEN gc.name
          ELSE NULL
        END as channel_name,
        CASE
          WHEN m.context_type = 'group_chat' THEN gcm.content
          ELSE NULL
        END as message_content
      FROM mentions m
      LEFT JOIN staff_users s1 ON m.mentioning_staff_id = s1.id
      LEFT JOIN group_chat_channels gc ON m.context_type = 'group_chat' AND m.context_id = gc.id
      LEFT JOIN group_chat_messages gcm ON m.message_id = gcm.id
      WHERE m.id = ? AND m.mentioned_staff_id = ?
    `;

    const { results } = await c.env.DB.prepare(query).bind(mentionId, user.id).all();

    if (!results || results.length === 0) {
      return c.json({ success: false, message: 'Mention not found' }, 404);
    }

    return c.json({
      success: true,
      mention: results[0],
    });
  } catch (error: any) {
    console.error('[Mentions] Error fetching mention:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Mark mention as read
export async function markMentionAsRead(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const mentionId = c.req.param('id');
    console.log('[Mentions] Marking as read - mentionId:', mentionId, 'userId:', user.id);

    const result = await c.env.DB.prepare(`
      UPDATE mentions
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ? AND mentioned_staff_id = ?
    `).bind(mentionId, user.id).run();

    console.log('[Mentions] Update result:', result.meta.changes, 'rows affected');

    return c.json({ success: true, message: 'Mention marked as read', rowsAffected: result.meta.changes });
  } catch (error: any) {
    console.error('[Mentions] Error marking mention as read:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Mark mention as unread
export async function markMentionAsUnread(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const mentionId = c.req.param('id');

    await c.env.DB.prepare(`
      UPDATE mentions
      SET is_read = 0, read_at = NULL
      WHERE id = ? AND mentioned_staff_id = ?
    `).bind(mentionId, user.id).run();

    return c.json({ success: true, message: 'Mention marked as unread' });
  } catch (error: any) {
    console.error('[Mentions] Error marking mention as unread:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Get unread mention count
export async function getUnreadCount(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM mentions
      WHERE mentioned_staff_id = ? AND is_read = 0
    `).bind(user.id).all();

    const count = (results[0] as any)?.count || 0;

    return c.json({ success: true, count });
  } catch (error: any) {
    console.error('[Mentions] Error getting unread count:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Edit/Update mention
export async function updateMention(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const mentionId = c.req.param('id');
    const body = await c.req.json();

    // Check if user is admin or the mention owner
    const isAdmin = user.role === 'admin' || user.role === 'manager';
    
    // Get existing mention
    const { results: existingMention } = await c.env.DB.prepare(`
      SELECT * FROM mentions WHERE id = ?
    `).bind(mentionId).all();

    if (!existingMention || existingMention.length === 0) {
      return c.json({ success: false, message: 'Mention not found' }, 404);
    }

    const mention = existingMention[0] as any;

    // Only admin or the mentioned staff can edit
    if (!isAdmin && mention.mentioned_staff_id !== user.id) {
      return c.json({ success: false, message: 'Unauthorized to edit this mention' }, 403);
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (body.ticket_id !== undefined) {
      updates.push('ticket_id = ?');
      params.push(body.ticket_id);
    }

    if (body.ticket_number !== undefined) {
      updates.push('ticket_number = ?');
      params.push(body.ticket_number);
    }

    if (body.customer_name !== undefined) {
      updates.push('customer_name = ?');
      params.push(body.customer_name);
    }

    if (body.is_read !== undefined) {
      updates.push('is_read = ?');
      params.push(body.is_read ? 1 : 0);
      
      if (body.is_read) {
        updates.push('read_at = datetime("now")');
      } else {
        updates.push('read_at = NULL');
      }
    }

    if (body.ai_action !== undefined) {
      updates.push('ai_action = ?');
      params.push(body.ai_action);
    }

    if (body.ai_status !== undefined) {
      updates.push('ai_status = ?');
      params.push(body.ai_status);
    }

    if (body.ai_result !== undefined) {
      updates.push('ai_result = ?');
      params.push(body.ai_result);
    }

    if (updates.length === 0) {
      return c.json({ success: false, message: 'No fields to update' }, 400);
    }

    // Add mention ID to params
    params.push(mentionId);

    // Execute update
    await c.env.DB.prepare(`
      UPDATE mentions
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Get updated mention
    const { results: updatedMention } = await c.env.DB.prepare(`
      SELECT 
        m.*,
        s1.first_name as mentioning_first_name,
        s1.last_name as mentioning_last_name,
        s1.email as mentioning_email,
        CASE 
          WHEN m.context_type = 'group_chat' THEN gc.name
          ELSE NULL
        END as channel_name,
        CASE
          WHEN m.context_type = 'group_chat' THEN gcm.content
          ELSE NULL
        END as message_content
      FROM mentions m
      LEFT JOIN staff_users s1 ON m.mentioning_staff_id = s1.id
      LEFT JOIN group_chat_channels gc ON m.context_type = 'group_chat' AND m.context_id = gc.id
      LEFT JOIN group_chat_messages gcm ON m.message_id = gcm.id
      WHERE m.id = ?
    `).bind(mentionId).all();

    return c.json({
      success: true,
      message: 'Mention updated successfully',
      mention: updatedMention[0],
    });
  } catch (error: any) {
    console.error('[Mentions] Error updating mention:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Delete mention (admin only)
export async function deleteMention(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    // Only admins can delete mentions
    const isAdmin = user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return c.json({ success: false, message: 'Only admins can delete mentions' }, 403);
    }

    const mentionId = c.req.param('id');

    // Check if mention exists
    const { results: existingMention } = await c.env.DB.prepare(`
      SELECT id FROM mentions WHERE id = ?
    `).bind(mentionId).all();

    if (!existingMention || existingMention.length === 0) {
      return c.json({ success: false, message: 'Mention not found' }, 404);
    }

    // Delete mention
    await c.env.DB.prepare(`
      DELETE FROM mentions WHERE id = ?
    `).bind(mentionId).run();

    return c.json({
      success: true,
      message: 'Mention deleted successfully',
    });
  } catch (error: any) {
    console.error('[Mentions] Error deleting mention:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
}

// Parse mentions from text
export function parseMentions(text: string): Array<{ type: 'all' | 'staff' | 'ai'; username: string }> {
  const mentionRegex = /@(\w+)/g;
  const mentions: Array<{ type: 'all' | 'staff' | 'ai'; username: string }> = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();

    // Skip numeric mentions (these are ticket references like @173, not staff mentions)
    if (/^\d+$/.test(username)) {
      continue;
    }

    if (username === 'all') {
      mentions.push({ type: 'all', username: 'all' });
    } else if (username === 'mccarthy') {
      mentions.push({ type: 'ai', username: 'mccarthy' });
    } else {
      mentions.push({ type: 'staff', username });
    }
  }

  return mentions;
}

// Create mention records
export async function createMentions(
  db: D1Database,
  messageId: string,
  mentioningStaffId: string,
  mentions: Array<{ type: 'all' | 'staff' | 'ai'; username: string }>,
  contextType: 'group_chat' | 'ticket_note',
  contextId: string,
  ticketId?: string,
  ticketNumber?: string,
  customerName?: string
): Promise<string[]> {
  const mentionIds: string[] = [];

  for (const mention of mentions) {
    if (mention.type === 'all') {
      // Get all members of the channel (if group chat) - includes self for consistency
      if (contextType === 'group_chat') {
        const { results: members } = await db.prepare(`
          SELECT staff_id
          FROM group_chat_members
          WHERE channel_id = ? AND is_active = 1
        `).bind(contextId).all();

        const now = new Date().toISOString();
        for (const member of members) {
          const mentionId = nanoid();
          await db.prepare(`
            INSERT INTO mentions (
              id, message_id, mentioned_staff_id, mentioning_staff_id,
              mention_type, context_type, context_id,
              ticket_id, ticket_number, customer_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            mentionId,
            messageId,
            (member as any).staff_id,
            mentioningStaffId,
            'all',
            contextType,
            contextId,
            ticketId || null,
            ticketNumber || null,
            customerName || null,
            now
          ).run();
          mentionIds.push(mentionId);
        }
      }
    } else if (mention.type === 'staff') {
      // Find staff by username (first name)
      const { results: staff } = await db.prepare(`
        SELECT id
        FROM staff_users
        WHERE LOWER(first_name) = ? OR LOWER(REPLACE(first_name || last_name, ' ', '')) = ?
        LIMIT 1
      `).bind(mention.username, mention.username).all();

      console.log('[Mentions] Looking for staff with username:', mention.username, 'found:', staff.length);
      if (staff && staff.length > 0) {
        const staffId = (staff[0] as any).id;
        console.log('[Mentions] Found staff ID:', staffId, 'mentioning staff:', mentioningStaffId);
        // Allow self-mentions (removed staffId !== mentioningStaffId check)
        const mentionId = nanoid();
        const now = new Date().toISOString();
        await db.prepare(`
          INSERT INTO mentions (
            id, message_id, mentioned_staff_id, mentioning_staff_id,
            mention_type, context_type, context_id,
            ticket_id, ticket_number, customer_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          mentionId,
          messageId,
          staffId,
          mentioningStaffId,
          'staff',
          contextType,
          contextId,
          ticketId || null,
          ticketNumber || null,
          customerName || null,
          now
        ).run();
        mentionIds.push(mentionId);
      }
    } else if (mention.type === 'ai') {
      // Create AI mention for processing
      const mentionId = nanoid();
      const now = new Date().toISOString();
      await db.prepare(`
        INSERT INTO mentions (
          id, message_id, mentioned_staff_id, mentioning_staff_id,
          mention_type, context_type, context_id,
          ai_status, ticket_id, ticket_number, customer_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        mentionId,
        messageId,
        'ai-agent-001', // McCarthy AI staff ID
        mentioningStaffId,
        'ai',
        contextType,
        contextId,
        'pending',
        ticketId || null,
        ticketNumber || null,
        customerName || null,
        now
      ).run();
      mentionIds.push(mentionId);
    }
  }

  return mentionIds;
}
