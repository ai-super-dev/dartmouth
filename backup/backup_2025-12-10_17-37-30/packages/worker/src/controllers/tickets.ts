/**
 * Tickets Controller
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import type { AuthUser } from '../middleware/auth';
import { parseTagsFromText, formatTagsForStorage } from '../utils/tag-parser';

/**
 * Parse mentions and channel shortcuts from task description
 * Supports: @all, @john (staff mentions), #customerservice, #task, #general (channel shortcuts)
 * Returns: { targetChannel, staffToMention, cleanedDescription }
 */
async function parseMentionsAndNotify(
  env: Env,
  taskTicketNumber: string,
  taskSubject: string,
  taskDescription: string,
  taskPriority: string,
  creatorId: string
) {
  try {
    // Extract channel shortcuts (#customerservice, #task, #general, etc.)
    const channelPattern = /#(\w+)/g;
    const channelMatches = taskDescription.matchAll(channelPattern);
    const channelShortcuts = Array.from(channelMatches).map(m => m[1].toLowerCase());
    
    // Extract staff mentions (@all, @john, etc.)
    const mentionPattern = /@(\w+)/g;
    const mentionMatches = taskDescription.matchAll(mentionPattern);
    const mentions = Array.from(mentionMatches).map(m => m[1].toLowerCase());
    
    console.log(`[TaskMentions] Task ${taskTicketNumber} - Channels:`, channelShortcuts, 'Mentions:', mentions);
    
    // Determine target channel from shortcuts (default to 'task')
    let targetChannelName = 'task'; // Default
    
    if (channelShortcuts.length > 0) {
      // Map shortcuts to channel names
      const channelMap: Record<string, string> = {
        'customerservice': 'customer-service',
        'cs': 'customer-service', // Backward compatibility
        'task': 'task',
        'general': 'general',
        'sales': 'sales',
        'support': 'support'
      };
      
      const firstChannel = channelShortcuts[0];
      targetChannelName = channelMap[firstChannel] || 'task';
    }
    
    // Get the target channel
    const channel = await env.DB.prepare(`
      SELECT id, name FROM group_chat_channels WHERE name = ? LIMIT 1
    `).first<{ id: string; name: string }>();
    
    if (!channel) {
      console.log(`[TaskMentions] Channel "${targetChannelName}" not found, using 'task' as fallback`);
      // Try to get task channel as fallback
      const taskChannel = await env.DB.prepare(`
        SELECT id, name FROM group_chat_channels WHERE name = 'task' LIMIT 1
      `).first<{ id: string; name: string }>();
      
      if (!taskChannel) {
        console.log(`[TaskMentions] No valid channel found, skipping notification`);
        return;
      }
    }
    
    // Get all staff members
    const allStaff = await env.DB.prepare(`
      SELECT id, first_name, last_name FROM staff_users
    `).all();
    
    // Determine who to mention
    const staffToMention: Array<{ id: string; firstName: string }> = [];
    
    for (const mention of mentions) {
      if (mention === 'all') {
        // Add all staff
        allStaff.results.forEach((s: any) => {
          if (!staffToMention.find(st => st.id === s.id)) {
            staffToMention.push({ id: s.id, firstName: s.first_name });
          }
        });
      } else {
        // Find specific staff member by first name or last name
        const staff = allStaff.results.find((s: any) => 
          s.first_name.toLowerCase() === mention || 
          s.last_name.toLowerCase() === mention
        );
        if (staff && !staffToMention.find(st => st.id === (staff as any).id)) {
          staffToMention.push({ id: (staff as any).id, firstName: (staff as any).first_name });
        }
      }
    }
    
    if (staffToMention.length === 0) {
      console.log(`[TaskMentions] No valid staff found for mentions, skipping notification`);
      return;
    }
    
    console.log(`[TaskMentions] Will mention ${staffToMention.length} staff members in ${channel?.name || targetChannelName} channel`);
    
    // Build priority badge
    const priorityEmojis: Record<string, string> = {
      low: '🟢',
      normal: '🔵',
      high: '🟠',
      critical: '🔴',
      urgent: '🚨'
    };
    const priorityEmoji = priorityEmojis[taskPriority] || '🔵';
    
    // Strip channel shortcuts from description for display
    let cleanedDescription = taskDescription;
    channelShortcuts.forEach(shortcut => {
      cleanedDescription = cleanedDescription.replace(new RegExp(`#${shortcut}\\b`, 'gi'), '');
    });
    cleanedDescription = cleanedDescription.trim();
    
    // Build message (without channel shortcuts, but WITH mentions)
    const mentionsText = staffToMention.map(s => `@${s.firstName.toLowerCase()}`).join(' ');
    const chatMessage = `${priorityEmoji} **New Task Created** - Priority: ${taskPriority.toUpperCase()}\n\n` +
      `**Task:** *${taskTicketNumber}* - ${taskSubject}\n\n` +
      `${mentionsText}`;
    
    // Post message to group chat
    const now = new Date().toISOString();
    const chatMessageId = `msg-${crypto.randomUUID()}`;
    
    await env.DB.prepare(`
      INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
      VALUES (?, ?, ?, 'staff', ?, ?)
    `).bind(chatMessageId, channel!.id, creatorId, chatMessage, now).run();
    
    // Create mentions for each staff member
    for (const staff of staffToMention) {
      await env.DB.prepare(`
        INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
        VALUES (?, ?, ?, ?, 'staff', 'group_chat', ?, ?)
      `).bind(
        crypto.randomUUID(),
        chatMessageId,
        staff.id,
        creatorId,
        channel!.id,
        now
      ).run();
    }
    
    console.log(`[TaskMentions] Posted notification to ${channel!.name} channel with ${staffToMention.length} mentions`);
    
    // Return cleaned description (without channel shortcuts)
    return cleanedDescription;
  } catch (error) {
    console.error('[TaskMentions] Error:', error);
    // Don't fail the task creation if notification fails
    return taskDescription; // Return original if error
  }
}

/**
 * Convert plain text to HTML with proper paragraph spacing
 * Uses consistent font styling (Arial) to match email signature
 */
function textToHtml(text: string): string {
  // Split by double newlines to get paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  // Convert each paragraph with consistent font styling
  const html = paragraphs
    .map(para => {
      // Within each paragraph, convert single newlines to <br>
      const lines = para.trim().replace(/\n/g, '<br>');
      // Use same font as signature: Arial, 14px, #333 color
      return lines ? `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${lines}</p>` : '';
    })
    .filter(p => p) // Remove empty paragraphs
    .join('\n');
  
  return html;
}

/**
 * List tickets with filters
 */
export async function listTickets(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    
    // Get query parameters
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assignedTo = c.req.query('assignedTo');
    const channel = c.req.query('channel'); // Filter by channel (e.g., 'task')
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Build query - fetch all tickets with escalation flags and staff names (exclude deleted)
    let query = `
      SELECT t.*, 
        MAX(CASE WHEN e.escalated_to = ? AND e.status = 'pending' THEN 1 ELSE 0 END) as is_escalated_to_me,
        MAX(CASE WHEN e.status = 'pending' THEN 1 ELSE 0 END) as has_escalation,
        s.first_name as assigned_staff_first_name,
        s.last_name as assigned_staff_last_name,
        CASE WHEN s.first_name IS NOT NULL THEN (s.first_name || ' ' || COALESCE(s.last_name, '')) ELSE NULL END as assigned_staff_name
      FROM tickets t
      LEFT JOIN escalations e ON t.ticket_id = e.ticket_id
      LEFT JOIN staff_users s ON t.assigned_to = s.id
      WHERE t.deleted_at IS NULL
    `;
    const params: any[] = [user.id];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    if (assignedTo) {
      query += ' AND t.assigned_to = ?';
      params.push(assignedTo);
    }

    if (channel) {
      query += ' AND t.channel = ?';
      params.push(channel);
    }

    // Group by ticket_id to handle multiple escalations
    query += ' GROUP BY t.ticket_id';

    // If agent role, only show their tickets OR tickets escalated to them
    if (user.role === 'agent') {
      query += ' HAVING (t.assigned_to = ? OR MAX(CASE WHEN e.escalated_to = ? AND e.status = \'pending\' THEN 1 ELSE 0 END) = 1)';
      params.push(user.id, user.id);
    }

    // Order: escalated tickets first, then by created_at
    query += ' ORDER BY is_escalated_to_me DESC, t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    console.log('[listTickets] Query params:', { status, priority, assignedTo, channel, limit, offset });
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    console.log('[listTickets] Found tickets:', results.length, 'Channel filter:', channel);

    return c.json({ tickets: results });
  } catch (error) {
    console.error('[Tickets] List error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get single ticket
 */
export async function getTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');

    const ticket = await c.env.DB.prepare(`
      SELECT * FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Check access
    if (user.role === 'agent' && ticket.assigned_to !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get messages
    const { results: messages } = await c.env.DB.prepare(`
      SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC
    `).bind(ticketId).all();

    // Get internal notes with escalation data (exclude deleted)
    const { results: notes } = await c.env.DB.prepare(`
      SELECT n.*, s.first_name, s.last_name, e.id as escalation_id, e.escalated_to, e.status as escalation_status, e.resolved_at
      FROM internal_notes n
      JOIN staff_users s ON n.staff_id = s.id
      LEFT JOIN escalations e ON n.ticket_id = e.ticket_id AND n.note_type = 'escalation' AND e.created_at = n.created_at
      WHERE n.ticket_id = ? AND (n.is_deleted IS NULL OR n.is_deleted = 0)
      ORDER BY n.created_at ASC
    `).bind(ticketId).all();

    // Get related tasks (tasks that reference this ticket)
    const { results: relatedTasks } = await c.env.DB.prepare(`
      SELECT ticket_number, subject, status, priority, assigned_to, sla_due_at, created_at
      FROM tickets 
      WHERE related_ticket_id = ? AND channel = 'task' AND deleted_at IS NULL
      ORDER BY created_at DESC
    `).bind(ticket.ticket_number).all();

    // Get sub-tasks (if this is a parent task)
    const { results: subTasks } = await c.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, status, priority, assigned_to, sla_due_at, created_at
      FROM tickets 
      WHERE parent_task_id = ? AND channel = 'task' AND deleted_at IS NULL
      ORDER BY ticket_number ASC
    `).bind(ticketId).all();

    // Get parent task (if this is a sub-task)
    let parentTask = null;
    if (ticket.parent_task_id) {
      parentTask = await c.env.DB.prepare(`
        SELECT ticket_id, ticket_number, subject, status, priority, assigned_to, sla_due_at, created_at
        FROM tickets 
        WHERE ticket_id = ? AND deleted_at IS NULL
      `).bind(ticket.parent_task_id).first();
    }

    return c.json({
      ticket,
      messages,
      notes,
      relatedTasks: relatedTasks || [],
      subTasks: subTasks || [],
      parentTask: parentTask || null
    });
  } catch (error) {
    console.error('[Tickets] Get error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get ticket messages only
 */
export async function getTicketMessages(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');

    // Check if ticket exists
    const ticket = await c.env.DB.prepare(`
      SELECT ticket_id, assigned_to FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Check access
    if (user.role === 'agent' && ticket.assigned_to !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get messages
    const { results: messages } = await c.env.DB.prepare(`
      SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC
    `).bind(ticketId).all();

    return c.json({ messages });
  } catch (error) {
    console.error('[Tickets] Get messages error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Assign ticket
 */
export async function assignTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const { assignedTo } = await c.req.json();

    if (!assignedTo) {
      return c.json({ error: 'assignedTo required' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE tickets
      SET assigned_to = ?, updated_at = datetime('now')
      WHERE ticket_id = ?
    `).bind(assignedTo, ticketId).run();

    return c.json({ message: 'Ticket assigned successfully' });
  } catch (error) {
    console.error('[Tickets] Assign error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const { status } = await c.req.json();

    if (!status) {
      return c.json({ error: 'status required' }, 400);
    }

    const now = new Date().toISOString();
    let resolvedAt = null;
    let closedAt = null;

    if (status === 'resolved') {
      resolvedAt = now;
    } else if (status === 'closed') {
      closedAt = now;
    }

    await c.env.DB.prepare(`
      UPDATE tickets
      SET status = ?, resolved_at = ?, closed_at = ?, updated_at = ?
      WHERE ticket_id = ?
    `).bind(status, resolvedAt, closedAt, now, ticketId).run();

    return c.json({ message: 'Ticket status updated' });
  } catch (error) {
    console.error('[Tickets] Update status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Reply to ticket
 */
export async function replyToTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const { content, attachments } = await c.req.json();

    console.log('[Tickets] Reply request:', { 
      ticketId, 
      contentLength: content?.length || 0, 
      attachmentsCount: attachments?.length || 0,
      hasContent: !!content?.trim(),
      firstAttachment: attachments?.[0] ? {
        name: attachments[0].name,
        type: attachments[0].type,
        size: attachments[0].size,
        contentLength: attachments[0].content?.length || 0
      } : null
    });

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      console.error('[Tickets] Reply validation failed: no content and no attachments');
      return c.json({ error: 'content or attachments required' }, 400);
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get ticket details
    const ticket = await c.env.DB.prepare(`
      SELECT customer_email, subject, conversation_id FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Get staff member's name from database
    const staffInfo = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first();

    const staffName = staffInfo 
      ? `${staffInfo.first_name} ${staffInfo.last_name}` 
      : user.email;
    // For message display, use just the first name
    const senderName = staffInfo?.first_name || staffName;

    // Send email via Resend (Email System V2)
    try {
      const { sendEmailThroughResend } = await import('../services/ResendService');
      
      // Get conversation ID from ticket
      const conversationId = ticket.conversation_id as string;
      
      if (!conversationId) {
        console.error(`[Tickets] No conversation_id found for ticket ${ticketId}`);
        throw new Error('Ticket has no conversation_id - cannot send email');
      }

      // Get mailbox info (assuming john@directtofilm.com.au for now)
      const mailbox = await c.env.DB.prepare(`
        SELECT id, email_address FROM mailboxes WHERE email_address = 'john@directtofilm.com.au' LIMIT 1
      `).first<{ id: string; email_address: string }>();

      if (!mailbox) {
        console.error(`[Tickets] No mailbox found for john@directtofilm.com.au`);
        throw new Error('Mailbox not configured');
      }

      // Build reply subject (ensure it has Re: prefix)
      const replySubject = ticket.subject && !(ticket.subject as string).startsWith('Re:')
        ? `Re: ${ticket.subject}`
        : ticket.subject as string;

      // Format attachments for email if present
      const emailAttachments = attachments?.map((att: { name: string; content: string; type: string }) => ({
        filename: att.name,
        content: att.content.split(',')[1] || att.content, // Remove data URL prefix if present
        type: att.type
      }));

      // Plain text message from frontend (no HTML signature included)
      const plainTextMessage = content?.trim() || (attachments && attachments.length > 0 ? '[See attachment]' : 'No content');
      
      // Convert message to HTML
      const messageHtml = textToHtml(plainTextMessage);
      
      // Fetch email signature settings and generate signature HTML
      let signatureHtml = '';
      try {
        const settingsJson = await c.env.APP_CONFIG?.get('signature_settings');
        // Use defaults if no settings saved
        const settings = settingsJson 
          ? JSON.parse(settingsJson)
          : {
              logoUrl: '',
              companyName: 'Amazing Transfers',
              email: 'info@amazingtransfers.com.au',
              website: 'amazingtransfers.com',
            };
        
        const { logoUrl, companyName, email, website } = settings;
        
        // Get staff job title
        const staffDetails = await c.env.DB.prepare(
          'SELECT job_title, department FROM staff_users WHERE id = ?'
        ).bind(user.id).first();
        const staffJobTitle = (staffDetails as any)?.job_title || (staffDetails as any)?.department || 'Customer Support Specialist';
        
        // Generate signature HTML
        signatureHtml = `
<br>
<p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  Regards,<br>
  <strong>${staffName}</strong><br>
  ${staffJobTitle}<br>
  ${companyName}<br>
  <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a><br>
  <a href="https://${website}" style="color: #0066cc; text-decoration: none;">${website}</a>
</p>
${logoUrl ? `<p style="margin: 10px 0 0 0;"><img src="${logoUrl}" alt="${companyName}" style="display: block; width: 120px; height: auto;" /></p>` : ''}`;
      } catch (sigError) {
        console.error('[Tickets] Failed to generate signature:', sigError);
        // Continue without signature
      }
      
      // Combine message HTML with signature
      const bodyHtml = messageHtml + signatureHtml;
      
      await sendEmailThroughResend(c.env, {
        tenantId: 'test-tenant-dtf', // TODO: Get from ticket/mailbox
        conversationId,
        mailboxId: mailbox.id,
        userId: user.id,
        toEmail: ticket.customer_email as string,
        fromEmail: mailbox.email_address,
        fromName: staffName,
        subject: replySubject,
        bodyHtml: bodyHtml,
        bodyText: plainTextMessage, // Plain text only, no HTML
        attachments: emailAttachments,
      });

      console.log(`[Tickets] ✅ Email sent to ${ticket.customer_email} via Resend`);
    } catch (emailError) {
      console.error(`[Tickets] Failed to send email:`, emailError);
      // Don't fail the entire request if email fails - still save the message
    }

    // Handle single attachment - upload to R2 if present
    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    let attachmentSize = null;

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      try {
        const { uploadAttachmentToR2 } = await import('../utils/r2-upload');
        const uploaded = await uploadAttachmentToR2(c.env.ATTACHMENTS, attachment, ticketId);
        attachmentUrl = uploaded.url; // Store R2 key
        attachmentName = uploaded.name;
        attachmentType = uploaded.type;
        attachmentSize = uploaded.size;
        console.log(`[Tickets] Uploaded attachment to R2: ${uploaded.url}`);
      } catch (uploadError) {
        console.error('[Tickets] Failed to upload attachment to R2:', uploadError);
        // Fall back to storing base64 in database if R2 upload fails
        attachmentUrl = attachment.content;
        attachmentName = attachment.name;
        attachmentType = attachment.type;
        attachmentSize = attachment.size;
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, content, attachment_url, attachment_name, attachment_type, attachment_size, created_at)
      VALUES (?, ?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId, 
      ticketId, 
      user.id, 
      senderName, 
      content?.trim() || '[Attachment]', 
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize,
      now
    ).run();

    // Update ticket
    await c.env.DB.prepare(`
      UPDATE tickets SET updated_at = ? WHERE ticket_id = ?
    `).bind(now, ticketId).run();

    console.log('[Tickets] Reply added successfully:', messageId);
    return c.json({ message: 'Reply added', messageId });
  } catch (error) {
    console.error('[Tickets] Reply error:', error);
    console.error('[Tickets] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Tickets] Error message:', error instanceof Error ? error.message : String(error));
    return c.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

/**
 * Add internal note
 */
// Helper function to parse @mentions from text
function parseMentions(text: string): Array<{ type: 'staff' | 'all' | 'ai'; staffId?: string; name?: string }> {
  const mentions: Array<{ type: 'staff' | 'all' | 'ai'; staffId?: string; name?: string }> = [];
  
  // Match @all, @mccarthy, @firstname patterns
  const mentionRegex = /@(\w+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1].toLowerCase();
    
    // Skip numeric mentions (these are ticket references like @173, not staff mentions)
    if (/^\d+$/.test(mentionText)) {
      continue;
    }
    
    if (mentionText === 'all') {
      mentions.push({ type: 'all' });
    } else if (mentionText === 'mccarthy') {
      mentions.push({ type: 'ai', staffId: 'ai-agent-001' });
    } else {
      // It's a staff mention by first name
      mentions.push({ type: 'staff', name: mentionText });
    }
  }
  
  return mentions;
}

export async function addNote(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const { content, noteType, attachments, tags } = await c.req.json();

    if (!content) {
      return c.json({ error: 'content required' }, 400);
    }

    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Parse tags from content using #keyword syntax
    const { tags: parsedTags, cleanedText } = parseTagsFromText(content || '');
    const finalContent = cleanedText || content;
    const finalTags = parsedTags.length > 0 ? formatTagsForStorage(parsedTags) : (tags || null);
    
    console.log('[Tickets] addNote TAG PARSING:', {
      originalContent: content,
      parsedTags,
      cleanedText,
      finalContent,
      finalTags
    });

    // Handle single attachment - upload to R2 if present
    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    let attachmentSize = null;

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      try {
        const { uploadAttachmentToR2 } = await import('../utils/r2-upload');
        const uploaded = await uploadAttachmentToR2(c.env.ATTACHMENTS, attachment, ticketId);
        attachmentUrl = uploaded.url; // Store R2 key
        attachmentName = uploaded.name;
        attachmentType = uploaded.type;
        attachmentSize = uploaded.size;
        console.log(`[Tickets] Uploaded note attachment to R2: ${uploaded.url}`);
      } catch (uploadError) {
        console.error('[Tickets] Failed to upload note attachment to R2:', uploadError);
        // Fall back to storing base64 in database if R2 upload fails
        attachmentUrl = attachment.content;
        attachmentName = attachment.name;
        attachmentType = attachment.type;
        attachmentSize = attachment.size;
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, tags, attachment_url, attachment_name, attachment_type, attachment_size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      noteId, 
      ticketId, 
      user.id, 
      noteType || 'general', 
      finalContent, 
      finalTags,
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize,
      now, 
      now
    ).run();

    // Parse @mentions and create mention entries
    const mentions = parseMentions(finalContent);
    console.log('[Tickets] Parsed mentions from note:', mentions.length, mentions);
    if (mentions.length > 0) {
      // Get ticket info for context
      const ticket = await c.env.DB.prepare(`
        SELECT ticket_number, customer_name FROM tickets WHERE ticket_id = ?
      `).bind(ticketId).first();

      // Get all staff to resolve first names to IDs
      const staffList = await c.env.DB.prepare(`
        SELECT id, first_name FROM staff_users
      `).all();

      const staffMap = new Map(
        staffList.results.map((s: any) => [s.first_name.toLowerCase(), s.id])
      );

      for (const mention of mentions) {
        if (mention.type === 'all') {
          // Create mention for all staff members (excluding AI agent)
          for (const staff of staffList.results) {
            if (staff.id !== 'ai-agent-001') {
              const mentionId = crypto.randomUUID();
              await c.env.DB.prepare(`
                INSERT INTO mentions (
                  id, message_id, mentioned_staff_id, mentioning_staff_id, 
                  mention_type, context_type, context_id, ticket_id, ticket_number, 
                  customer_name, is_read, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).bind(
                mentionId, noteId, staff.id, user.id,
                'all', 'ticket_note', ticketId, ticketId, 
                ticket?.ticket_number, ticket?.customer_name, now
              ).run();
            }
          }
        } else if (mention.type === 'staff' && mention.name) {
          // Resolve first name to staff ID (allow self-mentions)
          const staffId = staffMap.get(mention.name);
          console.log('[Tickets] Resolving staff mention:', mention.name, '→', staffId);
          if (staffId) {
            const mentionId = crypto.randomUUID();
            await c.env.DB.prepare(`
              INSERT INTO mentions (
                id, message_id, mentioned_staff_id, mentioning_staff_id, 
                mention_type, context_type, context_id, ticket_id, ticket_number, 
                customer_name, is_read, created_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            `).bind(
              mentionId, noteId, staffId, user.id,
              'staff', 'ticket_note', ticketId, ticketId, 
              ticket?.ticket_number, ticket?.customer_name, now
            ).run();
          }
        } else if (mention.type === 'ai') {
          // Create AI mention (for future @mccarthy commands)
          const mentionId = crypto.randomUUID();
          await c.env.DB.prepare(`
            INSERT INTO mentions (
              id, message_id, mentioned_staff_id, mentioning_staff_id, 
              mention_type, context_type, context_id, ticket_id, ticket_number, 
              customer_name, is_read, ai_status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)
          `).bind(
            mentionId, noteId, 'ai-agent-001', user.id,
            'ai', 'ticket_note', ticketId, ticketId, 
            ticket?.ticket_number, ticket?.customer_name, now
          ).run();
        }
      }

      console.log(`[Tickets] Created ${mentions.length} mention(s) from note ${noteId}`);
    }

    // Handle Parent/Child task linking for task tickets
    const currentTicket = await c.env.DB.prepare(`
      SELECT ticket_id, ticket_number, subject, channel, parent_task_id, assigned_to
      FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first<any>();

    if (currentTicket && currentTicket.channel === 'task') {
      await handleTaskNoteSync(c.env, currentTicket, noteId, user.id, finalContent, noteType || 'general', now);
    }

    return c.json({ message: 'Note added', noteId, mentionsCreated: mentions.length });
  } catch (error) {
    console.error('[Tickets] Add note error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Handle syncing notes between Parent and Child tasks
 */
async function handleTaskNoteSync(
  env: Env,
  currentTicket: any,
  noteId: string,
  staffId: string,
  content: string,
  noteType: string,
  timestamp: string
) {
  try {
    const relatedTasks: any[] = [];
    const involvedStaffIds = new Set<string>();
    involvedStaffIds.add(currentTicket.assigned_to);

    // If this is a parent task, get all child tasks
    if (!currentTicket.parent_task_id) {
      const { results: children } = await env.DB.prepare(`
        SELECT ticket_id, ticket_number, subject, assigned_to
        FROM tickets
        WHERE parent_task_id = ? AND deleted_at IS NULL
      `).bind(currentTicket.ticket_id).all();
      relatedTasks.push(...(children || []));
    } else {
      // If this is a child task, get parent and all siblings
      const parent = await env.DB.prepare(`
        SELECT ticket_id, ticket_number, subject, assigned_to
        FROM tickets
        WHERE ticket_id = ? AND deleted_at IS NULL
      `).bind(currentTicket.parent_task_id).first<any>();
      
      if (parent) {
        relatedTasks.push(parent);
        involvedStaffIds.add(parent.assigned_to);

        // Get siblings
        const { results: siblings } = await env.DB.prepare(`
          SELECT ticket_id, ticket_number, subject, assigned_to
          FROM tickets
          WHERE parent_task_id = ? AND ticket_id != ? AND deleted_at IS NULL
        `).bind(currentTicket.parent_task_id, currentTicket.ticket_id).all();
        relatedTasks.push(...(siblings || []));
      }
    }

    // Add notes to related tasks
    for (const relatedTask of relatedTasks) {
      involvedStaffIds.add(relatedTask.assigned_to);
      
      const relatedNoteId = crypto.randomUUID();
      const relatedContent = `[Note from ${currentTicket.parent_task_id ? 'Child' : 'Parent'} Task ${currentTicket.ticket_number}]\n\n${content}`;
      
      await env.DB.prepare(`
        INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        relatedNoteId,
        relatedTask.ticket_id,
        staffId,
        noteType,
        relatedContent,
        timestamp,
        timestamp
      ).run();
    }

    // Post to Task Group Chat
    const taskChannel = await env.DB.prepare(`
      SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
    `).first<{ id: string }>();

    if (taskChannel) {
      const messageId = `msg-${crypto.randomUUID()}`;
      const taskNumbers = [currentTicket.ticket_number, ...relatedTasks.map(t => t.ticket_number)];
      const taskMentions = taskNumbers.map(tn => `*${tn.replace('TSK-', '')}`).join(', ');
      
      const chatMessage = `📝 Staff note added to ${currentTicket.parent_task_id ? 'Child' : 'Parent'} Task ${taskMentions}\n\n"${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`;
      
      await env.DB.prepare(`
        INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
        VALUES (?, ?, ?, 'staff', ?, ?)
      `).bind(messageId, taskChannel.id, staffId, chatMessage, timestamp).run();

      // Create mentions for all involved staff (excluding duplicates and self if only one person)
      const uniqueStaffIds = Array.from(involvedStaffIds).filter(id => id);
      const shouldMentionSelf = uniqueStaffIds.length > 1 || uniqueStaffIds[0] !== staffId;
      
      for (const mentionedStaffId of uniqueStaffIds) {
        if (shouldMentionSelf || mentionedStaffId !== staffId) {
          await env.DB.prepare(`
            INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
            VALUES (?, ?, ?, ?, 'staff', 'group_chat', ?, ?)
          `).bind(
            crypto.randomUUID(),
            messageId,
            mentionedStaffId,
            staffId,
            taskChannel.id,
            timestamp
          ).run();
        }
      }

      console.log(`[TaskNoteSync] Synced note to ${relatedTasks.length} related task(s) and posted to Task channel`);
    }
  } catch (error) {
    console.error('[TaskNoteSync] Error syncing task notes:', error);
  }
}

/**
 * PUT /api/tickets/:id/notes/:noteId
 * Edit a staff note
 */
export async function editNote(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const noteId = c.req.param('noteId');
    const { content, tags } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'Content is required' }, 400);
    }

    // Check if note exists and user owns it
    const note = await c.env.DB.prepare(`
      SELECT staff_id FROM internal_notes WHERE id = ? AND ticket_id = ?
    `).bind(noteId, ticketId).first();

    if (!note) {
      return c.json({ error: 'Note not found' }, 404);
    }

    if (note.staff_id !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const now = new Date().toISOString();

    // Parse tags from content using #keyword syntax
    const { tags: parsedTags, cleanedText } = parseTagsFromText(content || '');
    const finalContent = cleanedText || content;
    const finalTags = parsedTags.length > 0 ? formatTagsForStorage(parsedTags) : (tags || null);

    await c.env.DB.prepare(`
      UPDATE internal_notes 
      SET content = ?, tags = ?, updated_at = ?, edited_at = ?
      WHERE id = ?
    `).bind(finalContent.trim(), finalTags, now, now, noteId).run();

    return c.json({ message: 'Note updated' });
  } catch (error) {
    console.error('[Tickets] Edit note error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * DELETE /api/tickets/:id/notes/:noteId
 * Delete a staff note
 */
export async function deleteNote(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const noteId = c.req.param('noteId');

    // Check if note exists and user owns it
    const note = await c.env.DB.prepare(`
      SELECT staff_id FROM internal_notes WHERE id = ? AND ticket_id = ?
    `).bind(noteId, ticketId).first();

    if (!note) {
      return c.json({ error: 'Note not found' }, 404);
    }

    if (note.staff_id !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Soft delete
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE internal_notes 
      SET is_deleted = 1, deleted_at = ?, deleted_by = ?
      WHERE id = ?
    `).bind(now, user.id, noteId).run();

    return c.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('[Tickets] Delete note error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Snooze ticket
 */
export async function snoozeTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const { snoozedUntil, reason } = await c.req.json();

    if (!snoozedUntil) {
      return c.json({ error: 'snoozedUntil required' }, 400);
    }

    const now = new Date().toISOString();

    // Update ticket status to 'snoozed' and set the snooze expiry time
    await c.env.DB.prepare(`
      UPDATE tickets
      SET status = 'snoozed', snoozed_until = ?, updated_at = ?
      WHERE ticket_id = ?
    `).bind(snoozedUntil, now, ticketId).run();

    // Get staff member's first name
    const staffUser = await c.env.DB.prepare(`
      SELECT first_name FROM staff_users WHERE id = ?
    `).bind(user.id).first<{ first_name: string }>();
    const staffName = staffUser?.first_name || 'Staff';

    // Add an internal note about the snooze
    // Use SNOOZE_TIME: marker so frontend can format in user's timezone
    const noteId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'general', ?, datetime('now'), datetime('now'))
    `).bind(
      noteId,
      ticketId,
      user.id,
      `💤 Snoozed until SNOOZE_TIME:${snoozedUntil} by ${staffName}`
    ).run();

    return c.json({ message: 'Ticket snoozed', snoozedUntil });
  } catch (error) {
    console.error('[Tickets] Snooze error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Unsnooze ticket
 */
export async function unsnoozeTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');

    await c.env.DB.prepare(`
      UPDATE tickets
      SET status = 'in-progress', updated_at = datetime('now')
      WHERE ticket_id = ?
    `).bind(ticketId).run();

    // Add an internal note about removing the snooze
    const noteId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'general', ?, datetime('now'), datetime('now'))
    `).bind(
      noteId,
      ticketId,
      user.id,
      '✅ Snooze removed - ticket is now active'
    ).run();

    return c.json({ message: 'Ticket unsnoozed' });
  } catch (error) {
    console.error('[Tickets] Unsnooze error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Escalate ticket - Request help from other staff members
 */
export async function escalateTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const { staffIds, reason } = body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return c.json({ error: 'At least one staff member must be selected' }, 400);
    }

    if (!reason || !reason.trim()) {
      return c.json({ error: 'Reason is required' }, 400);
    }

    const now = new Date().toISOString();

    // Create escalation records for each staff member
    const escalationIds: string[] = [];
    for (const staffId of staffIds) {
      const escalationId = crypto.randomUUID();
      escalationIds.push(escalationId);
      
      await c.env.DB.prepare(`
        INSERT INTO escalations (id, ticket_id, escalated_by, escalated_to, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).bind(escalationId, ticketId, user.id, staffId, reason, now).run();

      // Create @mention for the staff member
      const mentionId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO staff_mentions (id, ticket_id, from_staff_id, to_staff_id, message, priority, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 'high', 'ticket', FALSE, ?)
      `).bind(mentionId, ticketId, user.id, staffId, reason, now).run();
    }

    // Create staff note documenting the escalation
    const noteId = crypto.randomUUID();
    const staffNames = await Promise.all(
      staffIds.map(async (staffId: string) => {
        const staff = await c.env.DB.prepare(`
          SELECT first_name, last_name FROM staff_users WHERE id = ?
        `).bind(staffId).first();
        return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown';
      })
    );
    
    const noteContent = `🚨 Escalated to ${staffNames.join(', ')}: ${reason}`;
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'escalation', ?, ?, ?)
    `).bind(noteId, ticketId, user.id, noteContent, now, now).run();

    return c.json({ message: 'Ticket escalated successfully', escalationIds, noteId });
  } catch (error) {
    console.error('[Tickets] Escalate error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Resolve escalation - Mark escalation as resolved
 */
export async function resolveEscalation(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const { escalationId } = body;

    if (!escalationId) {
      return c.json({ error: 'Escalation ID is required' }, 400);
    }

    const now = new Date().toISOString();

    // Update escalation status to resolved
    await c.env.DB.prepare(`
      UPDATE escalations
      SET status = 'resolved', resolved_at = ?
      WHERE id = ? AND escalated_to = ?
    `).bind(now, escalationId, user.id).run();

    return c.json({ message: 'Escalation resolved successfully' });
  } catch (error) {
    console.error('[Tickets] Resolve escalation error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Schedule a reply to be sent at a specific time
 */
export async function scheduleReply(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const ticketId = c.req.param('id');
    const { content, scheduledFor } = await c.req.json();

    if (!content || !scheduledFor) {
      return c.json({ error: 'Content and scheduledFor are required' }, 400);
    }

    // Validate scheduledFor is in the future (allow 1 minute buffer for processing time)
    const scheduledDate = new Date(scheduledFor);
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute buffer
    
    console.log('[Schedule Reply] Validation:', {
      scheduledFor,
      scheduledDate: scheduledDate.toISOString(),
      now: now.toISOString(),
      isValid: scheduledDate > oneMinuteAgo
    });
    
    if (scheduledDate <= oneMinuteAgo) {
      return c.json({ 
        error: 'Scheduled time must be in the future',
        details: {
          scheduled: scheduledDate.toISOString(),
          current: now.toISOString()
        }
      }, 400);
    }

    // Generate unique ID
    const messageId = crypto.randomUUID();

    // Insert scheduled message
    await c.env.DB.prepare(`
      INSERT INTO scheduled_messages (id, ticket_id, staff_id, content, scheduled_for, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).bind(messageId, ticketId, user.id, content, scheduledFor).run();

    // Add an internal note to track the scheduled reply
    // Store the ISO timestamp so the frontend can format it in the user's timezone
    const noteId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'general', ?, datetime('now'), datetime('now'))
    `).bind(noteId, ticketId, user.id, `📅 Scheduled reply for SCHEDULE_TIME:${scheduledFor}`).run();

    return c.json({ 
      message: 'Reply scheduled successfully',
      scheduledMessageId: messageId,
      scheduledFor
    });
  } catch (error) {
    console.error('[Tickets] Schedule reply error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get scheduled messages for a ticket
 */
export async function getScheduledMessages(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');

    const { results: scheduledMessages } = await c.env.DB.prepare(`
      SELECT sm.*, s.first_name, s.last_name
      FROM scheduled_messages sm
      JOIN staff_users s ON sm.staff_id = s.id
      WHERE sm.ticket_id = ? AND sm.status = 'pending'
      ORDER BY sm.scheduled_for ASC
    `).bind(ticketId).all();

    return c.json({ scheduledMessages });
  } catch (error) {
    console.error('[Tickets] Get scheduled messages error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Update a scheduled message
 */
export async function updateScheduledMessage(c: Context<{ Bindings: Env }>) {
  try {
    const messageId = c.req.param('messageId');
    const { content, scheduledFor } = await c.req.json();
    
    console.log('[Update Scheduled Message]', { messageId, content, scheduledFor });

    if (!content || !scheduledFor) {
      return c.json({ error: 'Content and scheduledFor are required' }, 400);
    }

    // Validate scheduledFor is in the future
    const scheduledDate = new Date(scheduledFor);
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    if (scheduledDate <= oneMinuteAgo) {
      return c.json({ error: 'Scheduled time must be in the future' }, 400);
    }

    // Update the scheduled message
    await c.env.DB.prepare(`
      UPDATE scheduled_messages
      SET content = ?, scheduled_for = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).bind(content, scheduledFor, messageId).run();

    return c.json({ message: 'Scheduled message updated successfully' });
  } catch (error) {
    console.error('[Tickets] Update scheduled message error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Delete a scheduled message
 */
export async function deleteScheduledMessage(c: Context<{ Bindings: Env }>) {
  try {
    const messageId = c.req.param('messageId');

    await c.env.DB.prepare(`
      DELETE FROM scheduled_messages
      WHERE id = ? AND status = 'pending'
    `).bind(messageId).run();

    return c.json({ message: 'Scheduled message deleted successfully' });
  } catch (error) {
    console.error('[Tickets] Delete scheduled message error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get AI draft response for a ticket
 */
export async function getAIDraftResponse(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;

    // Get the most recent pending draft for this ticket
    const draft = await c.env.DB.prepare(`
      SELECT * FROM ai_draft_responses
      WHERE ticket_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(ticketId).first();

    if (!draft) {
      return c.json({ error: 'No AI draft found for this ticket' }, 404);
    }

    // Parse JSON fields
    const response = {
      ...draft,
      suggested_actions: draft.suggested_actions ? JSON.parse(draft.suggested_actions as string) : [],
      shopify_data: draft.shopify_data ? JSON.parse(draft.shopify_data as string) : null,
      perp_data: draft.perp_data ? JSON.parse(draft.perp_data as string) : null,
    };

    return c.json({ draft: response });
  } catch (error) {
    console.error('[Tickets] Get AI draft error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Approve and send AI draft response
 */
export async function approveAIDraftResponse(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;

    // Get staff name from database
    const staffUser = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first();
    const staffName = staffUser 
      ? `${staffUser.first_name || ''} ${staffUser.last_name || ''}`.trim() || user.email
      : user.email;

    console.log(`[RLHF] ✅ Send As-Is initiated for ticket ${ticketId}`, {
      staffId: user.id,
      staffName
    });

    // Get the pending draft
    const draft = await c.env.DB.prepare(`
      SELECT * FROM ai_draft_responses
      WHERE ticket_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(ticketId).first();

    if (!draft) {
      console.log(`[RLHF] ⚠️ No pending draft found for ticket ${ticketId}`);
      return c.json({ error: 'No pending draft found' }, 404);
    }

    console.log(`[RLHF] 📝 Approving draft without edits:`, {
      draftId: draft.id,
      contentLength: (draft.draft_content as string || '').length,
      confidence: draft.confidence_score
    });

    // Get ticket details
    const ticket = await c.env.DB.prepare(`
      SELECT customer_email, subject, conversation_id FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Send email via Resend
    const { sendEmailThroughResend } = await import('../services/ResendService');
    
    const conversationId = ticket.conversation_id as string | null;
    
    console.log(`[RLHF] 📧 Sending approved draft to ${ticket.customer_email}`);
    
    await sendEmailThroughResend(c.env, {
      tenantId: 'test-tenant-dtf', // TODO: Get from ticket or user context
      conversationId: conversationId || ticketId,
      mailboxId: 'mailbox-john', // TODO: Get from ticket or user context
      userId: 'ai-agent-001',
      toEmail: ticket.customer_email as string,
      fromEmail: 'support@directtofilm.com.au',
      fromName: 'DTF Support',
      subject: `Re: ${ticket.subject}`,
      bodyHtml: textToHtml(draft.draft_content as string),
      bodyText: draft.draft_content as string,
    });

    console.log(`[RLHF] ✅ Email sent successfully (no edits)`);

    // Add message to ticket_messages
    const messageId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, content, was_scheduled, created_at
      ) VALUES (?, ?, 'agent', 'ai-agent-001', 'McCarthy AI', ?, 0, datetime('now'))
    `).bind(messageId, ticketId, draft.draft_content).run();

    // Update draft status
    await c.env.DB.prepare(`
      UPDATE ai_draft_responses
      SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, draft.id).run();

    // Update ticket status if needed
    await c.env.DB.prepare(`
      UPDATE tickets
      SET status = 'in-progress', updated_at = datetime('now')
      WHERE ticket_id = ? AND status = 'open'
    `).bind(ticketId).run();

    console.log(`[RLHF] 💾 Draft marked as 'approved', ready for feedback collection`);

    return c.json({
      data: {
        message: { id: draft.id, ticket_id: ticketId, content: draft.draft_content },
        draft: { id: draft.id, status: 'approved', approved_by: user.id }
      }
    });
  } catch (error) {
    console.error('[RLHF] ❌ Approve AI draft error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Edit and send AI draft response
 */
export async function editAIDraftResponse(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { editedContent, content } = body;
    
    // Support both 'editedContent' and 'content' field names
    const finalContent = editedContent || content;

    // Get staff name from database
    const staffUser = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first();
    const staffName = staffUser 
      ? `${staffUser.first_name || ''} ${staffUser.last_name || ''}`.trim() || user.email
      : user.email;
    // For message display, use just the first name
    const senderName = staffUser?.first_name || staffName;

    console.log(`[RLHF] ✏️ Edit & Send initiated for ticket ${ticketId}`, {
      staffId: user.id,
      staffName,
      senderName,
      contentLength: finalContent?.length || 0
    });

    if (!finalContent) {
      console.error('[RLHF] ❌ No content provided in edit request');
      return c.json({ error: 'Edited content is required' }, 400);
    }

    // Get the pending draft
    const draft = await c.env.DB.prepare(`
      SELECT * FROM ai_draft_responses
      WHERE ticket_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(ticketId).first();

    if (!draft) {
      console.log(`[RLHF] ⚠️ No pending draft found for ticket ${ticketId}`);
      return c.json({ error: 'No pending draft found' }, 404);
    }

    const originalLength = (draft.draft_content as string || '').length;
    const editedLength = finalContent.length;
    const changePercent = Math.round(((editedLength - originalLength) / originalLength) * 100);

    console.log(`[RLHF] 📊 Draft comparison:`, {
      draftId: draft.id,
      originalLength,
      editedLength,
      changePercent: `${changePercent > 0 ? '+' : ''}${changePercent}%`,
      wasSignificantlyEdited: Math.abs(changePercent) > 20
    });

    // Get ticket details
    const ticket = await c.env.DB.prepare(`
      SELECT customer_email, subject, conversation_id FROM tickets WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Send email via Resend with edited content
    const { sendEmailThroughResend } = await import('../services/ResendService');
    
    const conversationId = ticket.conversation_id as string | null;
    
    console.log(`[RLHF] 📧 Sending edited email to ${ticket.customer_email}`);
    
    await sendEmailThroughResend(c.env, {
      tenantId: 'test-tenant-dtf', // TODO: Get from ticket or user context
      conversationId: conversationId || ticketId,
      mailboxId: 'mailbox-john', // TODO: Get from ticket or user context
      userId: user.id,
      toEmail: ticket.customer_email as string,
      fromEmail: 'support@directtofilm.com.au',
      fromName: 'DTF Support',
      subject: `Re: ${ticket.subject}`,
      bodyHtml: textToHtml(finalContent),
      bodyText: finalContent,
    });

    console.log(`[RLHF] ✅ Email sent successfully`);

    // Add message to ticket_messages (with edited content)
    const messageId = crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, content, was_scheduled, created_at
      ) VALUES (?, ?, 'agent', ?, ?, ?, 0, datetime('now'))
    `).bind(messageId, ticketId, user.id, senderName, finalContent).run();

    // Update draft status
    await c.env.DB.prepare(`
      UPDATE ai_draft_responses
      SET status = 'edited', approved_by = ?, approved_at = datetime('now'), 
          edited_content = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, finalContent, draft.id).run();

    // Update ticket status if needed
    await c.env.DB.prepare(`
      UPDATE tickets
      SET status = 'in-progress', updated_at = datetime('now')
      WHERE ticket_id = ? AND status = 'open'
    `).bind(ticketId).run();

    console.log(`[RLHF] 💾 Draft marked as 'edited', ready for feedback collection`);
    
    return c.json({
      data: {
        message: { id: draft.id, ticket_id: ticketId, content: finalContent },
        draft: { id: draft.id, status: 'edited', approved_by: user.id, edited_content: finalContent }
      }
    });
  } catch (error) {
    console.error('[RLHF] ❌ Edit AI draft error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Submit feedback for AI draft response (for learning/improvement)
 */
export async function submitAIDraftFeedback(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { qualityScore, wasHelpful, improvementNotes } = body;

    // Get staff name from database
    const staffUser = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first();
    const staffName = staffUser 
      ? `${staffUser.first_name || ''} ${staffUser.last_name || ''}`.trim() || user.email
      : user.email;

    console.log(`[RLHF] 📊 Feedback received for ticket ${ticketId}:`, {
      qualityScore,
      wasHelpful,
      hasNotes: !!improvementNotes,
      staffId: user.id,
      staffName
    });

    if (!qualityScore || wasHelpful === undefined) {
      return c.json({ error: 'Quality score and wasHelpful are required' }, 400);
    }

    // Get the draft
    const draft = await c.env.DB.prepare(`
      SELECT id, draft_content, edited_content, intent, ticket_id FROM ai_draft_responses
      WHERE ticket_id = ? AND status IN ('approved', 'edited')
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(ticketId).first();

    if (!draft) {
      console.log(`[RLHF] ⚠️ No draft found for ticket ${ticketId}`);
      return c.json({ error: 'No draft found for this ticket' }, 404);
    }

    console.log(`[RLHF] 📝 Draft found: ${draft.id}`, {
      intent: draft.intent,
      wasEdited: !!draft.edited_content,
      originalLength: (draft.draft_content as string || '').length,
      editedLength: (draft.edited_content as string || draft.draft_content as string).length
    });

    // Calculate edit distance (simple character count difference)
    const originalLength = (draft.draft_content as string || '').length;
    const editedLength = (draft.edited_content as string || draft.draft_content as string).length;
    const editDistance = Math.abs(editedLength - originalLength);

    console.log(`[RLHF] 📏 Edit distance calculated: ${editDistance} characters changed`);

    // Update draft with feedback
    await c.env.DB.prepare(`
      UPDATE ai_draft_responses
      SET quality_score = ?, was_helpful = ?, improvement_notes = ?, 
          edit_distance = ?, feedback_submitted_at = datetime('now'), 
          feedback_submitted_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(qualityScore, wasHelpful ? 1 : 0, improvementNotes || null, editDistance, user.id, draft.id).run();

    console.log(`[RLHF] ✅ Feedback saved to database`);

    // If quality score is 4 or 5, add to learning examples
    if (qualityScore >= 4) {
      console.log(`[RLHF] 🌟 High-quality response detected (${qualityScore}/5) - adding to learning examples`);
      
      const ticket = await c.env.DB.prepare(`
        SELECT description FROM tickets WHERE ticket_id = ?
      `).bind(ticketId).first();

      if (ticket) {
        const learningExampleId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO ai_learning_examples (
            id, draft_id, customer_message, ai_response, intent, sentiment, quality_score, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          learningExampleId,
          draft.id,
          ticket.description as string,
          draft.edited_content || draft.draft_content,
          draft.intent || 'unknown',
          'neutral', // TODO: Get from ticket
          qualityScore
        ).run();

        console.log(`[RLHF] 🎓 Learning example created: ${learningExampleId}`, {
          intent: draft.intent || 'unknown',
          qualityScore,
          responseLength: (draft.edited_content || draft.draft_content as string).length
        });
      }
    } else {
      console.log(`[RLHF] 📉 Low score (${qualityScore}/5) - not added to learning examples`);
    }

    console.log(`[RLHF] 🎯 COMPLETE - Feedback pipeline finished for draft ${draft.id}`);

    return c.json({
      message: 'Feedback submitted successfully',
      data: { draftId: draft.id, qualityScore, wasHelpful }
    });
  } catch (error) {
    console.error('[RLHF] ❌ Submit feedback error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Reject AI draft response
 */
export async function rejectAIDraftResponse(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { reason } = body;

    // Get the pending draft
    const draft = await c.env.DB.prepare(`
      SELECT * FROM ai_draft_responses
      WHERE ticket_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(ticketId).first();

    if (!draft) {
      return c.json({ error: 'No pending draft found' }, 404);
    }

    // Update draft status
    await c.env.DB.prepare(`
      UPDATE ai_draft_responses
      SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), 
          rejection_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, reason || 'No reason provided', draft.id).run();

    return c.json({
      data: {
        draft: {
          id: draft.id,
          status: 'rejected',
          rejected_by: user.id,
          rejection_reason: reason || 'No reason provided'
        }
      }
    });
  } catch (error) {
    console.error('[Tickets] Reject AI draft error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Delete a ticket (soft delete)
 * DELETE /api/tickets/:id
 */
/**
 * Bulk assign multiple tickets to a staff member
 * POST /api/tickets/bulk-assign
 * Body: { ticketIds: string[], assignedTo: string | null }
 */
export async function bulkAssignTickets(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { ticketIds, assignedTo } = body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return c.json({ error: 'ticketIds array is required' }, 400);
    }

    console.log(`[Tickets] Bulk assign ${ticketIds.length} tickets to ${assignedTo || 'unassigned'} by ${user.email}`);

    // Get staff name for the note
    let staffName = 'Unassigned';
    if (assignedTo) {
      const staffUser = await c.env.DB.prepare(`
        SELECT first_name, last_name FROM staff_users WHERE id = ?
      `).bind(assignedTo).first<{ first_name: string; last_name: string }>();
      
      if (staffUser) {
        staffName = `${staffUser.first_name} ${staffUser.last_name}`;
      }
    }

    // Get the assigner's first name only
    const assignerUser = await c.env.DB.prepare(`
      SELECT first_name FROM staff_users WHERE id = ?
    `).bind(user.id).first<{ first_name: string }>();
    const assignerFirstName = assignerUser?.first_name || 'Staff';

    const now = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    for (const ticketId of ticketIds) {
      try {
        // Update the ticket assignment
        await c.env.DB.prepare(`
          UPDATE tickets
          SET assigned_to = ?, updated_at = ?
          WHERE ticket_id = ? AND (deleted_at IS NULL OR deleted_at = '')
        `).bind(assignedTo, now, ticketId).run();

        // Add a note about the reassignment
        // Use BULK_REASSIGN_TIME: marker so frontend can format in user's timezone
        const noteId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, ?, 'system', ?, datetime('now'), datetime('now'))
        `).bind(
          noteId,
          ticketId,
          user.id,
          `📋 Reassigned to ${staffName}: Bulk BULK_REASSIGN_TIME:${now} by ${assignerFirstName}`
        ).run();

        successCount++;
      } catch (err) {
        console.error(`[Tickets] Failed to reassign ticket ${ticketId}:`, err);
        failCount++;
      }
    }

    console.log(`[Tickets] Bulk assign complete: ${successCount} success, ${failCount} failed`);

    return c.json({
      message: `Successfully reassigned ${successCount} ticket${successCount !== 1 ? 's' : ''}`,
      successCount,
      failCount,
      assignedTo: assignedTo || null,
      assignedToName: staffName
    });
  } catch (error) {
    console.error('[Tickets] Bulk assign error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/tickets/create-manual
 * Create a ticket manually (for phone calls, walk-ins, etc.)
 * Body: { customer_name, customer_email, customer_phone?, subject, message, channel, priority, assign_to? }
 */
export async function createManualTicket(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { customer_name, customer_email, customer_phone, subject, message, channel, priority, assign_to, related_ticket, deadline, parent_task_id } = body;

    // Validation
    if (!customer_name || !customer_email || !subject || !message || !channel) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log(`[Tickets] Creating manual ticket by ${user.email} for ${customer_email}, channel=${channel}`);
    const startTime = Date.now();

    const now = new Date().toISOString();
    const ticketId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();

    // Generate ticket number - use different prefix for tasks vs tickets
    console.log(`[Tickets] Channel value: "${channel}", type: ${typeof channel}, isTask: ${channel === 'task'}, parent_task_id: ${parent_task_id}`);
    const prefix = channel === 'task' ? 'TSK' : 'TKT';
    
    let ticketNumber: string;
    
    // If this is a sub-task, generate sub-task number (TSK-123-1, TSK-123-2)
    if (parent_task_id && channel === 'task') {
      // Get parent task number
      const parentTask = await c.env.DB.prepare(`
        SELECT ticket_number FROM tickets WHERE ticket_id = ?
      `).bind(parent_task_id).first<{ ticket_number: string }>();
      
      if (!parentTask) {
        return c.json({ error: 'Parent task not found' }, 404);
      }
      
      // Count existing sub-tasks for this parent
      const subTaskCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE parent_task_id = ?
      `).bind(parent_task_id).first<{ count: number }>();
      
      const subTaskNumber = (subTaskCount?.count || 0) + 1;
      ticketNumber = `${parentTask.ticket_number}-${subTaskNumber}`;
      console.log(`[Tickets] Sub-task number generated: ${ticketNumber}`);
    } else {
      // Regular ticket/task numbering
      const countResult = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE ticket_number LIKE ? AND parent_task_id IS NULL
      `).bind(`${prefix}-%`).first<{ count: number }>();
      
      // For tasks, start numbering from 100 (minimum 3 digits)
      let nextNumber = (countResult?.count || 0) + 1;
      if (channel === 'task' && nextNumber < 100) {
        nextNumber = 100;
      }
      ticketNumber = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
      console.log(`[Tickets] Ticket number generated in ${Date.now() - startTime}ms: ${ticketNumber}`);
    }

    // Determine assigned_to (auto-assign or manual)
    let assignedTo = assign_to || null;
    
    // Skip auto-assignment for tasks - use the provided assign_to or default to creator
    if (!assignedTo) {
      // Default to the user creating the ticket
      assignedTo = user.id;
    }
    console.log(`[Tickets] Assignment resolved in ${Date.now() - startTime}ms: ${assignedTo}`)

    // Create ticket
    await c.env.DB.prepare(`
      INSERT INTO tickets (
        ticket_id, ticket_number, conversation_id, customer_id, customer_name, customer_email,
        subject, description, channel, status, priority, category, assigned_to, sentiment,
        sla_due_at, related_ticket_id, parent_task_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 'general', ?, 'neutral', ?, ?, ?, ?, ?)
    `).bind(
      ticketId,
      ticketNumber,
      conversationId,
      customer_email, // customer_id is the email
      customer_name,
      customer_email,
      subject,
      message,
      channel,
      priority || 'normal',
      assignedTo,
      deadline || null, // sla_due_at stores the deadline
      related_ticket || null, // related_ticket_id links tasks to tickets
      parent_task_id || null, // parent_task_id links sub-tasks to parent tasks
      now,
      now
    ).run();

    // Get staff info first (need it for message and notes)
    const staffUser = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first<{ first_name: string; last_name: string }>();
    
    const staffName = staffUser ? `${staffUser.first_name} ${staffUser.last_name}` : 'Staff';

    // For email tickets, create initial message (staff is initiating the email)
    // For tasks, skip this - the description field IS the task content
    if (channel === 'email') {
      const messageId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO ticket_messages (
          id, ticket_id, sender_type, sender_id, sender_name, content, created_at
        ) VALUES (?, ?, 'agent', ?, ?, ?, ?)
      `).bind(
        messageId,
        ticketId,
        user.id,
        staffName,
        message,
        now
      ).run();
    }

    // Add system note about manual creation
    const noteId = crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'system', ?, ?, ?)
    `).bind(
      noteId,
      ticketId,
      user.id,
      `📝 Ticket created manually by ${staffName} via dashboard`,
      now,
      now
    ).run();

    // Handle parent/child task linking
    if (channel === 'task' && parent_task_id) {
      // This is a child (sub-task) - add notes to both parent and child
      const parentTask = await c.env.DB.prepare(`
        SELECT ticket_number, subject, assigned_to FROM tickets WHERE ticket_id = ?
      `).bind(parent_task_id).first<{ ticket_number: string; subject: string; assigned_to: string | null }>();
      
      if (parentTask) {
        // Add note to child task referencing parent
        const childNoteId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, ?, 'system', ?, ?, ?)
        `).bind(
          childNoteId,
          ticketId,
          user.id,
          `🔗 Child task of Parent: ${parentTask.ticket_number}`,
          now,
          now
        ).run();
        
        // Add note to parent task referencing child
        const parentNoteId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, ?, 'system', ?, ?, ?)
        `).bind(
          parentNoteId,
          parent_task_id,
          user.id,
          `🔗 Child task created: ${ticketNumber}`,
          now,
          now
        ).run();
        
        // Post to Task Group Chat channel
        const taskChannel = await c.env.DB.prepare(`
          SELECT id FROM group_chat_channels WHERE name = 'Tasks' LIMIT 1
        `).first<{ id: string }>();
        
        if (taskChannel) {
          const parentMention = `*${parentTask.ticket_number.replace('TSK-', '')}`;
          const childMention = `*${ticketNumber.replace('TSK-', '')}`;
          
          // Get assigned staff for both tasks
          const childAssignedStaff = await c.env.DB.prepare(`
            SELECT id, first_name FROM staff_users WHERE id = ?
          `).bind(assignedTo).first<{ id: string; first_name: string }>();
          
          let parentAssignedStaff = null;
          if (parentTask.assigned_to) {
            parentAssignedStaff = await c.env.DB.prepare(`
              SELECT id, first_name FROM staff_users WHERE id = ?
            `).bind(parentTask.assigned_to).first<{ id: string; first_name: string }>();
          }
          
          // Build message with mentions
          let chatMessage = `🔗 Child task ${childMention} created for Parent ${parentMention}\n\n`;
          chatMessage += `Parent: "${parentTask.subject}"\n`;
          chatMessage += `Child: "${subject}"\n\n`;
          
          // Mention staff members
          const mentionedStaff: Array<{ id: string; firstName: string }> = [];
          
          if (childAssignedStaff) {
            mentionedStaff.push({ id: childAssignedStaff.id, firstName: childAssignedStaff.first_name });
          }
          
          if (parentAssignedStaff && parentAssignedStaff.id !== childAssignedStaff?.id) {
            mentionedStaff.push({ id: parentAssignedStaff.id, firstName: parentAssignedStaff.first_name });
          }
          
          if (mentionedStaff.length > 0) {
            chatMessage += mentionedStaff.map(s => `@${s.firstName.toLowerCase()}`).join(' ');
          }
          
          // Post message
          const chatMessageId = `msg-${crypto.randomUUID()}`;
          await c.env.DB.prepare(`
            INSERT INTO group_chat_messages (id, channel_id, sender_id, sender_type, content, created_at)
            VALUES (?, ?, 'system', 'system', ?, ?)
          `).bind(chatMessageId, taskChannel.id, chatMessage, now).run();
          
          // Create mentions
          for (const staff of mentionedStaff) {
            await c.env.DB.prepare(`
              INSERT INTO mentions (id, message_id, mentioned_staff_id, mentioning_staff_id, mention_type, context_type, context_id, created_at)
              VALUES (?, ?, ?, 'system', 'staff', 'group_chat', ?, ?)
            `).bind(
              crypto.randomUUID(),
              chatMessageId,
              staff.id,
              taskChannel.id,
              now
            ).run();
          }
          
          console.log(`[Tickets] Posted parent/child link notification to Task channel`);
        }
      }
    }

    console.log(`[Tickets] Manual ticket created: ${ticketNumber} (${ticketId}) in ${Date.now() - startTime}ms`);

    // For task channel, parse mentions and notify via group chat
    if (channel === 'task' && message) {
      const cleanedDescription = await parseMentionsAndNotify(
        c.env,
        ticketNumber,
        subject,
        message,
        priority,
        user.id
      );
      
      // Update ticket description to remove channel shortcuts (keep mentions)
      if (cleanedDescription && cleanedDescription !== message) {
        await c.env.DB.prepare(`
          UPDATE tickets SET description = ? WHERE ticket_id = ?
        `).bind(cleanedDescription, ticketId).run();
        console.log(`[Tickets] Updated task description (removed channel shortcuts)`);
      }
    }

    // For email channel, send the email to customer via Resend
    let emailSent = false;
    if (channel === 'email') {
      try {
        const { sendEmailThroughResend } = await import('../services/ResendService');

        // Get mailbox
        const mailbox = await c.env.DB.prepare(`
          SELECT id, email_address FROM mailboxes WHERE email_address = 'john@directtofilm.com.au' LIMIT 1
        `).first<{ id: string; email_address: string }>();

        if (mailbox) {
          // Convert message to HTML
          const messageHtml = message.split(/\n\n+/).map((para: string) => {
            const lines = para.trim().replace(/\n/g, '<br>');
            return lines ? `<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${lines}</p>` : '';
          }).filter((p: string) => p).join('\n');

          // Get signature
          let signatureHtml = '';
          try {
            const settingsJson = await c.env.APP_CONFIG?.get('signature_settings');
            const settings = settingsJson 
              ? JSON.parse(settingsJson)
              : {
                  logoUrl: '',
                  companyName: 'Amazing Transfers',
                  email: 'info@amazingtransfers.com.au',
                  website: 'amazingtransfers.com',
                };
            
            const { logoUrl, companyName, email, website } = settings;
            const staffDetails = await c.env.DB.prepare(
              'SELECT job_title, department FROM staff_users WHERE id = ?'
            ).bind(user.id).first();
            const staffJobTitle = (staffDetails as any)?.job_title || 'Customer Support';
            
            signatureHtml = `
<br>
<p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  Regards,<br>
  <strong>${staffName}</strong><br>
  ${staffJobTitle}<br>
  ${companyName}<br>
  <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a><br>
  <a href="https://${website}" style="color: #0066cc; text-decoration: none;">${website}</a>
</p>
${logoUrl ? `<p style="margin: 10px 0 0 0;"><img src="${logoUrl}" alt="${companyName}" style="display: block; width: 120px; height: auto;" /></p>` : ''}`;
          } catch (sigError) {
            console.error('[Tickets] Failed to get signature for manual ticket:', sigError);
          }

          const bodyHtml = messageHtml + signatureHtml;

          await sendEmailThroughResend(c.env, {
            tenantId: 'test-tenant-dtf',
            conversationId: conversationId,
            mailboxId: mailbox.id,
            userId: user.id,
            toEmail: customer_email,
            fromEmail: mailbox.email_address,
            fromName: staffName,
            subject: subject,
            bodyHtml: bodyHtml,
            bodyText: message,
          });

          emailSent = true;
          console.log(`[Tickets] Email sent to ${customer_email} for manual ticket ${ticketNumber}`);
        } else {
          console.error('[Tickets] No mailbox configured - email not sent');
        }
      } catch (emailError) {
        console.error('[Tickets] Failed to send email for manual ticket:', emailError);
        // Continue - ticket is created, just email failed
      }
    }

    console.log(`[Tickets] Total createManualTicket time: ${Date.now() - startTime}ms`);
    return c.json({
      message: 'Ticket created successfully',
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      assigned_to: assignedTo,
      email_sent: emailSent
    });
  } catch (error) {
    console.error('[Tickets] Create manual ticket error:', error);
    return c.json({ error: 'Failed to create ticket' }, 500);
  }
}

export async function deleteTicket(c: Context<{ Bindings: Env }>) {
  try {
    const ticketId = c.req.param('id');
    const user = c.get('user') as AuthUser;

    // Check if ticket exists and is not already deleted
    const ticket = await c.env.DB.prepare(`
      SELECT ticket_id, ticket_number, status, deleted_at
      FROM tickets
      WHERE ticket_id = ?
    `).bind(ticketId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (ticket.deleted_at) {
      return c.json({ error: 'Ticket is already deleted' }, 400);
    }

    // Soft delete the ticket
    await c.env.DB.prepare(`
      UPDATE tickets
      SET deleted_at = datetime('now'),
          deleted_by = ?,
          updated_at = datetime('now')
      WHERE ticket_id = ?
    `).bind(user.id, ticketId).run();

    console.log(`[Tickets] Ticket ${ticket.ticket_number} soft deleted by ${user.email}`);

    return c.json({
      message: 'Ticket deleted successfully',
      ticket_id: ticketId,
      ticket_number: ticket.ticket_number
    });
  } catch (error) {
    console.error('[Tickets] Delete ticket error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Merge multiple tickets into one
 * POST /api/tickets/:id/merge
 * Body: { secondaryTicketIds: string[] }
 */
export async function mergeTickets(c: Context<{ Bindings: Env }>) {
  try {
    const primaryTicketId = c.req.param('id');
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const { secondaryTicketIds } = body;

    if (!secondaryTicketIds || !Array.isArray(secondaryTicketIds) || secondaryTicketIds.length === 0) {
      return c.json({ error: 'secondaryTicketIds array is required' }, 400);
    }

    // Get primary ticket
    const primaryTicket = await c.env.DB.prepare(`
      SELECT ticket_id, ticket_number, customer_email, subject, status
      FROM tickets
      WHERE ticket_id = ?
    `).bind(primaryTicketId).first();

    if (!primaryTicket) {
      return c.json({ error: 'Primary ticket not found' }, 404);
    }

    // Get secondary tickets
    const secondaryTickets = [];
    for (const ticketId of secondaryTicketIds) {
      const ticket = await c.env.DB.prepare(`
        SELECT ticket_id, ticket_number, customer_email, subject
        FROM tickets
        WHERE ticket_id = ?
      `).bind(ticketId).first();
      
      if (ticket) {
        secondaryTickets.push(ticket);
      }
    }

    if (secondaryTickets.length === 0) {
      return c.json({ error: 'No valid secondary tickets found' }, 400);
    }

    const now = new Date().toISOString();
    const mergedTicketNumbers = secondaryTickets.map(t => t.ticket_number).join(', ');

    // 1. Get all messages from secondary tickets
    for (const secondaryTicket of secondaryTickets) {
      // Get messages from secondary ticket
      const { results: messages } = await c.env.DB.prepare(`
        SELECT id, sender_type, sender_id, sender_name, content, created_at
        FROM ticket_messages
        WHERE ticket_id = ?
        ORDER BY created_at ASC
      `).bind(secondaryTicket.ticket_id).all();

      // Move messages to primary ticket (update ticket_id)
      for (const msg of messages as any[]) {
        await c.env.DB.prepare(`
          UPDATE ticket_messages
          SET ticket_id = ?
          WHERE id = ?
        `).bind(primaryTicketId, msg.id).run();
      }

      // Also copy the description as a message if it exists
      const secondaryTicketFull = await c.env.DB.prepare(`
        SELECT description, customer_name, customer_email, created_at
        FROM tickets WHERE ticket_id = ?
      `).bind(secondaryTicket.ticket_id).first() as any;

      if (secondaryTicketFull?.description) {
        const messageId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, content, created_at)
          VALUES (?, ?, 'customer', ?, ?, ?, ?)
        `).bind(
          messageId,
          primaryTicketId,
          secondaryTicketFull.customer_email,
          secondaryTicketFull.customer_name || secondaryTicketFull.customer_email,
          `[Merged from ${secondaryTicket.ticket_number}] ${secondaryTicketFull.description}`,
          secondaryTicketFull.created_at
        ).run();
      }

      // 2. Close the secondary ticket with a note
      await c.env.DB.prepare(`
        UPDATE tickets
        SET status = 'closed',
            updated_at = ?
        WHERE ticket_id = ?
      `).bind(now, secondaryTicket.ticket_id).run();

      // Add system note to secondary ticket
      const noteId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, content, created_at)
        VALUES (?, ?, 'system', 'system', 'System', ?, ?)
      `).bind(
        noteId,
        secondaryTicket.ticket_id,
        `[Merged] This ticket was merged into ${primaryTicket.ticket_number} by ${user.email}`,
        now
      ).run();
    }

    // Get staff info for proper name display
    const staffInfo = await c.env.DB.prepare(`
      SELECT first_name, last_name FROM staff_users WHERE id = ?
    `).bind(user.id).first() as { first_name: string; last_name: string } | null;
    
    const staffName = staffInfo 
      ? `${staffInfo.first_name} ${staffInfo.last_name}` 
      : user.email;

    // 3. Add system note to primary ticket (visible in conversation)
    const primaryNoteId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, content, created_at)
      VALUES (?, ?, 'system', 'system', 'System', ?, ?)
    `).bind(
      primaryNoteId,
      primaryTicketId,
      `[Merged] Tickets ${mergedTicketNumbers} were merged into this ticket by ${staffName}. All messages have been combined in chronological order.`,
      now
    ).run();

    // 4. Add staff note with merge details (using internal_notes table)
    const staffNoteId = crypto.randomUUID();
    
    // Store the ISO timestamp in the note - frontend will need to parse and format it
    // Format: MERGE_TIMESTAMP:2025-12-03T10:30:00.000Z
    await c.env.DB.prepare(`
      INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
      VALUES (?, ?, ?, 'general', ?, ?, ?)
    `).bind(
      staffNoteId,
      primaryTicketId,
      user.id,
      `Merged: ${primaryTicket.ticket_number} and ${mergedTicketNumbers}\nMERGE_TIMESTAMP:${now}\nBy ${staffName}`,
      now,
      now
    ).run();

    // 5. Update primary ticket with merge info
    try {
      await c.env.DB.prepare(`
        UPDATE tickets
        SET merged_from = ?,
            merged_at = ?,
            merged_by = ?,
            updated_at = ?,
            status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END
        WHERE ticket_id = ?
      `).bind(mergedTicketNumbers, now, staffName, now, primaryTicketId).run();
    } catch (e) {
      // Some columns might not exist yet, try simpler update
      console.log('[Tickets] Some merge columns not found, trying fallback');
      try {
        await c.env.DB.prepare(`
          UPDATE tickets
          SET merged_from = ?,
              updated_at = ?,
              status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END
          WHERE ticket_id = ?
        `).bind(mergedTicketNumbers, now, primaryTicketId).run();
      } catch (e2) {
        // Just update status
        await c.env.DB.prepare(`
          UPDATE tickets
          SET updated_at = ?,
              status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END
          WHERE ticket_id = ?
        `).bind(now, primaryTicketId).run();
      }
    }

    console.log(`[Tickets] Merged ${secondaryTickets.length} tickets into ${primaryTicket.ticket_number} by ${user.email}`);

    return c.json({
      message: 'Tickets merged successfully',
      primary_ticket: primaryTicket.ticket_number,
      merged_tickets: secondaryTickets.map(t => t.ticket_number),
      total_merged: secondaryTickets.length
    });
  } catch (error) {
    console.error('[Tickets] Merge tickets error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}


