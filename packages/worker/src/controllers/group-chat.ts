import { Context } from 'hono';
import { Env } from '../types/shared';
import { uploadAttachmentToR2 } from '../utils/r2-upload';

// ============================================================================
// GROUP CHAT CONTROLLER
// Handles all group chat operations: channels, messages, members
// ============================================================================

// ============================================================================
// CHANNELS
// ============================================================================

/**
 * GET /api/group-chat/channels
 * List all channels the current user is a member of
 */
export async function listChannels(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all channels where user is an active member
    const channels = await c.env.DB.prepare(`
      SELECT 
        ch.*,
        (
          SELECT COUNT(*) 
          FROM group_chat_messages m 
          WHERE m.channel_id = ch.id 
          AND m.is_deleted = 0
          AND m.created_at > COALESCE(
            (SELECT last_read_at FROM group_chat_read_receipts WHERE channel_id = ch.id AND staff_id = ?),
            '1970-01-01'
          )
        ) as unread_count,
        (
          SELECT content 
          FROM group_chat_messages 
          WHERE channel_id = ch.id AND is_deleted = 0
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM group_chat_messages 
          WHERE channel_id = ch.id AND is_deleted = 0
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_at
      FROM group_chat_channels ch
      INNER JOIN group_chat_members m ON m.channel_id = ch.id
      WHERE m.staff_id = ?
      AND m.is_active = 1
      AND ch.is_archived = 0
      ORDER BY last_message_at DESC NULLS LAST, ch.created_at DESC
    `).bind(user.id, user.id).all();

    return c.json({ channels: channels.results || [] });
  } catch (error) {
    console.error('[Group Chat] Error listing channels:', error);
    return c.json({ error: 'Failed to list channels' }, 500);
  }
}

/**
 * POST /api/group-chat/channels
 * Create a new channel
 */
export async function createChannel(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, description, channelType, memberIds } = await c.req.json();

    if (!name || name.trim().length === 0) {
      return c.json({ error: 'Channel name is required' }, 400);
    }

    const channelId = `channel-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // Create channel
    await c.env.DB.prepare(`
      INSERT INTO group_chat_channels (id, name, description, channel_type, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      channelId,
      name.trim(),
      description || null,
      channelType || 'public',
      user.id,
      now,
      now
    ).run();

    // Add creator as admin member
    await c.env.DB.prepare(`
      INSERT INTO group_chat_members (id, channel_id, staff_id, role, joined_at)
      VALUES (?, ?, ?, 'admin', ?)
    `).bind(`member-${crypto.randomUUID()}`, channelId, user.id, now).run();

    // Add additional members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      for (const staffId of memberIds) {
        if (staffId !== user.id) {
          await c.env.DB.prepare(`
            INSERT INTO group_chat_members (id, channel_id, staff_id, role, joined_at)
            VALUES (?, ?, ?, 'member', ?)
          `).bind(`member-${crypto.randomUUID()}`, channelId, staffId, now).run();
        }
      }
    }

    // Get the created channel
    const channel = await c.env.DB.prepare(`
      SELECT * FROM group_chat_channels WHERE id = ?
    `).bind(channelId).first();

    return c.json({ channel }, 201);
  } catch (error) {
    console.error('[Group Chat] Error creating channel:', error);
    return c.json({ error: 'Failed to create channel' }, 500);
  }
}

/**
 * GET /api/group-chat/channels/:id
 * Get channel details
 */
export async function getChannel(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    // Get channel details
    const channel = await c.env.DB.prepare(`
      SELECT * FROM group_chat_channels WHERE id = ? AND is_archived = 0
    `).bind(channelId).first();

    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }

    return c.json({ channel });
  } catch (error) {
    console.error('[Group Chat] Error getting channel:', error);
    return c.json({ error: 'Failed to get channel' }, 500);
  }
}

/**
 * PATCH /api/group-chat/channels/:id
 * Update channel details
 */
export async function updateChannel(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const { name, description } = await c.req.json();

    // Check if user is an admin of the channel
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND role = 'admin' AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Only channel admins can update channel details' }, 403);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE group_chat_channels 
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).bind(name, description || null, now, channelId).run();

    const channel = await c.env.DB.prepare(`
      SELECT * FROM group_chat_channels WHERE id = ?
    `).bind(channelId).first();

    return c.json({ channel });
  } catch (error) {
    console.error('[Group Chat] Error updating channel:', error);
    return c.json({ error: 'Failed to update channel' }, 500);
  }
}

/**
 * DELETE /api/group-chat/channels/:id
 * Archive a channel (soft delete)
 */
export async function archiveChannel(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');

    // Check if user is an admin of the channel
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND role = 'admin' AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Only channel admins can archive channels' }, 403);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE group_chat_channels 
      SET is_archived = 1, archived_at = ?, archived_by = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, user.id, now, channelId).run();

    return c.json({ success: true, message: 'Channel archived' });
  } catch (error) {
    console.error('[Group Chat] Error archiving channel:', error);
    return c.json({ error: 'Failed to archive channel' }, 500);
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * GET /api/group-chat/channels/:id/messages
 * Get messages for a channel (paginated)
 */
export async function getMessages(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    const before = c.req.query('before'); // Message ID to fetch messages before

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    let query = `
      SELECT 
        m.*,
        s.first_name,
        s.last_name,
        s.email
      FROM group_chat_messages m
      LEFT JOIN staff_users s ON s.id = m.sender_id
      WHERE m.channel_id = ? AND m.is_deleted = 0
    `;

    const params: any[] = [channelId];

    if (before) {
      query += ` AND m.created_at < (SELECT created_at FROM group_chat_messages WHERE id = ?)`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);

    const messages = await c.env.DB.prepare(query).bind(...params).all();

    // Reverse to show oldest first
    const messagesArray = (messages.results || []).reverse();

    return c.json({ messages: messagesArray });
  } catch (error) {
    console.error('[Group Chat] Error getting messages:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
}

/**
 * POST /api/group-chat/channels/:id/messages
 * Send a message to a channel
 */
export async function sendMessage(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const { content, attachments } = await c.req.json();

    if (!content || content.trim().length === 0) {
      if (!attachments || attachments.length === 0) {
        return c.json({ error: 'Message content or attachment is required' }, 400);
      }
    }

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    const messageId = `msg-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    let attachmentSize = null;
    let messageType = 'text';

    // Handle file attachment
    if (attachments && attachments.length > 0) {
      const file = attachments[0];
      const uploaded = await uploadAttachmentToR2(c.env.ATTACHMENTS, file, `group-chat-${channelId}`);
      attachmentUrl = uploaded.url;
      attachmentName = uploaded.name;
      attachmentType = uploaded.type;
      attachmentSize = uploaded.size;
      messageType = 'file';
    }

    // Insert message
    await c.env.DB.prepare(`
      INSERT INTO group_chat_messages (
        id, channel_id, sender_id, content, message_type,
        attachment_url, attachment_name, attachment_type, attachment_size,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      channelId,
      user.id,
      content?.trim() || '[Attachment]',
      messageType,
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize,
      now,
      now
    ).run();

    // Get the created message with sender info
    const message = await c.env.DB.prepare(`
      SELECT 
        m.*,
        s.first_name,
        s.last_name,
        s.email
      FROM group_chat_messages m
      LEFT JOIN staff_users s ON s.id = m.sender_id
      WHERE m.id = ?
    `).bind(messageId).first();

    return c.json({ message }, 201);
  } catch (error) {
    console.error('[Group Chat] Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
}

/**
 * GET /api/group-chat/channels/:id/poll
 * Poll for new messages (real-time updates)
 */
export async function pollMessages(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const after = c.req.query('after'); // Message ID to fetch messages after

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    let query = `
      SELECT 
        m.*,
        s.first_name,
        s.last_name,
        s.email
      FROM group_chat_messages m
      LEFT JOIN staff_users s ON s.id = m.sender_id
      WHERE m.channel_id = ? AND m.is_deleted = 0
    `;

    const params: any[] = [channelId];

    if (after) {
      query += ` AND m.created_at > (SELECT created_at FROM group_chat_messages WHERE id = ?)`;
      params.push(after);
    }

    query += ` ORDER BY m.created_at ASC`;

    const messages = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ messages: messages.results || [] });
  } catch (error) {
    console.error('[Group Chat] Error polling messages:', error);
    return c.json({ error: 'Failed to poll messages' }, 500);
  }
}

/**
 * PATCH /api/group-chat/messages/:id
 * Edit a message
 */
export async function editMessage(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const messageId = c.req.param('id');
    const { content } = await c.req.json();

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Message content is required' }, 400);
    }

    // Check if user is the sender
    const message = await c.env.DB.prepare(`
      SELECT * FROM group_chat_messages WHERE id = ? AND sender_id = ? AND is_deleted = 0
    `).bind(messageId, user.id).first();

    if (!message) {
      return c.json({ error: 'Message not found or you are not the sender' }, 403);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE group_chat_messages 
      SET content = ?, edited_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(content.trim(), now, now, messageId).run();

    const updatedMessage = await c.env.DB.prepare(`
      SELECT 
        m.*,
        s.first_name,
        s.last_name,
        s.email
      FROM group_chat_messages m
      LEFT JOIN staff_users s ON s.id = m.sender_id
      WHERE m.id = ?
    `).bind(messageId).first();

    return c.json({ message: updatedMessage });
  } catch (error) {
    console.error('[Group Chat] Error editing message:', error);
    return c.json({ error: 'Failed to edit message' }, 500);
  }
}

/**
 * DELETE /api/group-chat/messages/:id
 * Delete a message (soft delete)
 */
export async function deleteMessage(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const messageId = c.req.param('id');

    // Check if user is the sender or a channel admin
    const message = await c.env.DB.prepare(`
      SELECT m.*, mem.role
      FROM group_chat_messages m
      LEFT JOIN group_chat_members mem ON mem.channel_id = m.channel_id AND mem.staff_id = ?
      WHERE m.id = ? AND m.is_deleted = 0
    `).bind(user.id, messageId).first();

    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Allow deletion if user is sender or channel admin
    if (message.sender_id !== user.id && message.role !== 'admin') {
      return c.json({ error: 'You can only delete your own messages or be a channel admin' }, 403);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE group_chat_messages 
      SET is_deleted = 1, deleted_at = ?, deleted_by = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, user.id, now, messageId).run();

    return c.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('[Group Chat] Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
}

// ============================================================================
// MEMBERS
// ============================================================================

/**
 * GET /api/group-chat/channels/:id/members
 * List channel members
 */
export async function getMembers(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    const members = await c.env.DB.prepare(`
      SELECT 
        m.*,
        s.first_name,
        s.last_name,
        s.email,
        s.availability_status
      FROM group_chat_members m
      LEFT JOIN staff_users s ON s.id = m.staff_id
      WHERE m.channel_id = ? AND m.is_active = 1
      ORDER BY m.role DESC, s.first_name ASC
    `).bind(channelId).all();

    return c.json({ members: members.results || [] });
  } catch (error) {
    console.error('[Group Chat] Error getting members:', error);
    return c.json({ error: 'Failed to get members' }, 500);
  }
}

/**
 * POST /api/group-chat/channels/:id/members
 * Add a member to a channel
 */
export async function addMember(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const { staffId } = await c.req.json();

    if (!staffId) {
      return c.json({ error: 'Staff ID is required' }, 400);
    }

    // Check if user is an admin of the channel
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND role = 'admin' AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Only channel admins can add members' }, 403);
    }

    // Check if staff member exists
    const staff = await c.env.DB.prepare(`
      SELECT * FROM staff_users WHERE id = ?
    `).bind(staffId).first();

    if (!staff) {
      return c.json({ error: 'Staff member not found' }, 404);
    }

    // Check if already a member
    const existingMember = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, staffId).first();

    if (existingMember) {
      return c.json({ error: 'Staff member is already a member of this channel' }, 400);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO group_chat_members (id, channel_id, staff_id, role, joined_at)
      VALUES (?, ?, ?, 'member', ?)
    `).bind(`member-${crypto.randomUUID()}`, channelId, staffId, now).run();

    return c.json({ success: true, message: 'Member added' }, 201);
  } catch (error) {
    console.error('[Group Chat] Error adding member:', error);
    return c.json({ error: 'Failed to add member' }, 500);
  }
}

/**
 * DELETE /api/group-chat/channels/:id/members/:staffId
 * Remove a member from a channel
 */
export async function removeMember(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const staffId = c.req.param('staffId');

    // Check if user is an admin of the channel or removing themselves
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    if (membership.role !== 'admin' && user.id !== staffId) {
      return c.json({ error: 'Only channel admins can remove other members' }, 403);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE group_chat_members 
      SET is_active = 0, left_at = ?
      WHERE channel_id = ? AND staff_id = ?
    `).bind(now, channelId, staffId).run();

    return c.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('[Group Chat] Error removing member:', error);
    return c.json({ error: 'Failed to remove member' }, 500);
  }
}

/**
 * POST /api/group-chat/channels/:id/read
 * Mark channel as read
 */
export async function markAsRead(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const channelId = c.req.param('id');
    const { messageId } = await c.req.json();

    // Check if user is a member
    const membership = await c.env.DB.prepare(`
      SELECT * FROM group_chat_members 
      WHERE channel_id = ? AND staff_id = ? AND is_active = 1
    `).bind(channelId, user.id).first();

    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403);
    }

    const now = new Date().toISOString();

    // Upsert read receipt
    await c.env.DB.prepare(`
      INSERT INTO group_chat_read_receipts (id, channel_id, staff_id, last_read_message_id, last_read_at, unread_count)
      VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(channel_id, staff_id) 
      DO UPDATE SET last_read_message_id = ?, last_read_at = ?, unread_count = 0
    `).bind(
      `receipt-${crypto.randomUUID()}`,
      channelId,
      user.id,
      messageId,
      now,
      messageId,
      now
    ).run();

    return c.json({ success: true, message: 'Channel marked as read' });
  } catch (error) {
    console.error('[Group Chat] Error marking as read:', error);
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
}

/**
 * GET /api/group-chat/unread
 * Get unread counts for all channels
 */
export async function getUnreadCounts(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const unreadCounts = await c.env.DB.prepare(`
      SELECT 
        ch.id as channel_id,
        ch.name as channel_name,
        COUNT(m.id) as unread_count
      FROM group_chat_channels ch
      INNER JOIN group_chat_members mem ON mem.channel_id = ch.id
      LEFT JOIN group_chat_messages m ON m.channel_id = ch.id 
        AND m.is_deleted = 0
        AND m.created_at > COALESCE(
          (SELECT last_read_at FROM group_chat_read_receipts WHERE channel_id = ch.id AND staff_id = ?),
          '1970-01-01'
        )
      WHERE mem.staff_id = ?
      AND mem.is_active = 1
      AND ch.is_archived = 0
      GROUP BY ch.id, ch.name
    `).bind(user.id, user.id).all();

    return c.json({ unreadCounts: unreadCounts.results || [] });
  } catch (error) {
    console.error('[Group Chat] Error getting unread counts:', error);
    return c.json({ error: 'Failed to get unread counts' }, 500);
  }
}

