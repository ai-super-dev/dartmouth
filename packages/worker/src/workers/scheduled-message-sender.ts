/**
 * Scheduled Message Sender
 * Sends scheduled messages when their scheduled time has passed
 * Updated to use Email System V2 (Resend)
 */

import type { Env } from '../types/shared';
import { sendEmailThroughResend } from '../services/ResendService';

export async function sendScheduledMessages(env: Env): Promise<void> {
  console.log('[Scheduled Messages] Starting job at:', new Date().toISOString());
  
  try {
    // Get all pending scheduled messages where scheduled_for <= now
    const now = new Date().toISOString();
    const { results: messages } = await env.DB.prepare(`
      SELECT sm.*, t.ticket_id, t.customer_email, t.subject, t.conversation_id, s.first_name, s.last_name
      FROM scheduled_messages sm
      JOIN tickets t ON sm.ticket_id = t.ticket_id
      JOIN staff_users s ON sm.staff_id = s.id
      WHERE sm.status = 'pending' AND sm.scheduled_for <= ?
      ORDER BY sm.scheduled_for ASC
    `).bind(now).all();

    console.log(`[Scheduled Messages] Found ${messages.length} messages to send`);

    for (const message of messages as any[]) {
      try {
        console.log(`[Scheduled Messages] Sending message ${message.id} for ticket ${message.ticket_id}`);
        
        // Check if ticket has a conversation_id
        if (!message.conversation_id) {
          console.error(`[Scheduled Messages] No conversation_id found for ticket ${message.ticket_id}`);
          throw new Error('Ticket has no conversation_id - cannot send email');
        }

        // Get the latest email in the conversation for threading
        const latestEmail = await env.DB.prepare(`
          SELECT message_id, in_reply_to, "references"
          FROM emails
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(message.conversation_id).first<{
          message_id: string;
          in_reply_to: string | null;
          references: string | null;
        }>();

        if (!latestEmail) {
          console.error(`[Scheduled Messages] No emails found in conversation ${message.conversation_id}`);
          throw new Error('No emails found in conversation for threading');
        }

        // Get mailbox info
        const mailbox = await env.DB.prepare(`
          SELECT id, email_address FROM mailboxes WHERE email_address = 'john@directtofilm.com.au' LIMIT 1
        `).first<{ id: string; email_address: string }>();

        if (!mailbox) {
          console.error(`[Scheduled Messages] No mailbox found for john@directtofilm.com.au`);
          throw new Error('Mailbox not configured');
        }

        // Build threading headers
        const inReplyTo = latestEmail.message_id;
        const references = latestEmail.references 
          ? `${latestEmail.references} ${latestEmail.message_id}`
          : latestEmail.message_id;

        // Generate new message ID
        const newMessageId = `<${crypto.randomUUID()}@directtofilm.com.au>`;

        // Build reply subject (ensure it has Re: prefix)
        const replySubject = message.subject.startsWith('Re:') 
          ? message.subject 
          : `Re: ${message.subject}`;

        // Get staff member's full name
        const staffName = `${message.first_name} ${message.last_name}`;
        
        // Send the email via Resend
        try {
          await sendEmailThroughResend(env, {
            tenantId: 'test-tenant-dtf', // TODO: Get from ticket/mailbox
            mailboxId: mailbox.id,
            conversationId: message.conversation_id,
            userId: message.staff_id,
            toEmail: message.customer_email,
            fromEmail: mailbox.email_address,
            fromName: staffName,
            subject: replySubject,
            bodyText: message.content,
            bodyHtml: `<p>${message.content.replace(/\n/g, '<br>')}</p>`,
          });
          console.log(`[Scheduled Messages] ✅ Email sent to ${message.customer_email} via Resend`);
        } catch (emailError) {
          console.error(`[Scheduled Messages] Failed to send email:`, emailError);
          throw new Error(`Email send failed: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        }
        
        // Insert the message as a regular ticket message
        // Use the scheduled_for time as created_at so it appears in chronological order
        const messageId = crypto.randomUUID();
        
        await env.DB.prepare(`
          INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, content, created_at, was_scheduled)
          VALUES (?, ?, 'agent', ?, ?, ?, ?, TRUE)
        `).bind(messageId, message.ticket_id, message.staff_id, staffName, message.content, message.scheduled_for).run();

        // Update the scheduled message status to 'sent'
        await env.DB.prepare(`
          UPDATE scheduled_messages
          SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).bind(message.id).run();

        // Update the ticket's updated_at timestamp
        await env.DB.prepare(`
          UPDATE tickets
          SET updated_at = datetime('now')
          WHERE ticket_id = ?
        `).bind(message.ticket_id).run();

        console.log(`[Scheduled Messages] Successfully sent message ${message.id}`);
      } catch (error) {
        console.error(`[Scheduled Messages] Error sending message ${message.id}:`, error);
        
        // Mark as failed
        await env.DB.prepare(`
          UPDATE scheduled_messages
          SET status = 'failed', error_message = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(error instanceof Error ? error.message : 'Unknown error', message.id).run();
      }
    }

    console.log('[Scheduled Messages] Job completed');
  } catch (error) {
    console.error('[Scheduled Messages] Job error:', error);
  }
}

