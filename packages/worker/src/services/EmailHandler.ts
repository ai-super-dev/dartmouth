/**
 * Email Handler for Cloudflare Email Routing
 * Receives inbound emails and stores them in D1
 */

import { TicketManager } from './TicketManager';
import type { NormalizedMessage } from './OmnichannelRouter';

export interface Env {
  DB: D1Database;
}

export interface EmailMessage {
  from: string;
  to: string | string[]; // Cloudflare sends as string, but support array too
  headers: Map<string, string>;
  raw: ReadableStream<Uint8Array>;
}

interface ParsedEmail {
  headersText: string;
  bodyText: string;
  bodyHtml: string | null;
}

interface ParsedAddress {
  name: string | null;
  email: string | null;
}

// Removed duplicate detection functions - using TicketManager instead

/**
 * Parse raw MIME email into headers and body.
 * This is a minimal parser - for production, consider using a proper MIME library.
 */
async function parseRawMime(raw: ReadableStream<Uint8Array>): Promise<ParsedEmail> {
  const reader = raw.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.length;
    }
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const text = new TextDecoder('utf-8').decode(merged);

  // Split headers from body
  const [rawHeaders, ...bodyParts] = text.split(/\r?\n\r?\n/);
  const fullBody = bodyParts.join('\n\n');

  // Check if this is a multipart message
  const contentTypeMatch = rawHeaders.match(/Content-Type:\s*([^;\r\n]+)/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : '';
  
  let bodyText: string | null = null;
  let bodyHtml: string | null = null;

  if (contentType.startsWith('multipart/')) {
    // Extract boundary
    const boundaryMatch = rawHeaders.match(/boundary=["']?([^"'\s;]+)["']?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = fullBody.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'));
      
      for (const part of parts) {
        if (!part.trim() || part.trim() === '--') continue;
        
        // Split part headers from content
        const [partHeaders, ...partContentParts] = part.split(/\r?\n\r?\n/);
        const partContent = partContentParts.join('\n\n').trim();
        
        if (!partContent) continue;
        
        // Check content type and encoding
        const partContentType = partHeaders.match(/Content-Type:\s*([^;\r\n]+)/i)?.[1]?.trim() || '';
        const partEncoding = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1]?.trim() || '';
        
        // Decode content if base64
        let decodedContent = partContent;
        if (partEncoding.toLowerCase() === 'base64') {
          try {
            decodedContent = atob(partContent.replace(/\s/g, ''));
          } catch (e) {
            console.warn('[EmailHandler] Failed to decode base64 content:', e);
            decodedContent = partContent;
          }
        }
        
        // Store text or HTML part
        if (partContentType.includes('text/plain') && !bodyText) {
          bodyText = decodedContent;
        } else if (partContentType.includes('text/html') && !bodyHtml) {
          bodyHtml = decodedContent;
        }
      }
    }
  } else {
    // Single part message
    const encoding = rawHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1]?.trim() || '';
    let decodedBody = fullBody;
    
    if (encoding.toLowerCase() === 'base64') {
      try {
        decodedBody = atob(fullBody.replace(/\s/g, ''));
      } catch (e) {
        console.warn('[EmailHandler] Failed to decode base64 content:', e);
      }
    }
    
    const hasHtmlTags = /<html[\s>]|<body[\s>]|<\/p>|<\/div>/.test(decodedBody);
    bodyText = hasHtmlTags ? decodedBody.replace(/<[^>]+>/g, '').trim() : decodedBody;
    bodyHtml = hasHtmlTags ? decodedBody : null;
  }

  // If we have HTML but no text, extract text from HTML
  if (bodyHtml && !bodyText) {
    bodyText = bodyHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  return {
    headersText: rawHeaders,
    bodyText: bodyText || '',
    bodyHtml: bodyHtml || null,
  };
}

/**
 * Parse email address from "Name <email@domain>" format.
 */
function parseAddress(input: string | null | undefined): ParsedAddress {
  if (!input) return { name: null, email: null };

  const emailMatch = input.match(/<([^>]+)>/);
  if (emailMatch) {
    const email = emailMatch[1].trim();
    const namePart = input.replace(emailMatch[0], '').trim();
    return {
      name: namePart.replace(/^"|"$/g, '') || null,
      email,
    };
  }

  return {
    name: null,
    email: input.trim(),
  };
}

/**
 * Look up mailbox and tenant by recipient email address.
 */
async function resolveMailboxAndTenant(
  env: Env,
  toAddress: string
): Promise<{ mailbox_id: string; tenant_id: string } | null> {
  const mailbox = await env.DB.prepare(
    `
    SELECT m.id as mailbox_id,
           m.tenant_id as tenant_id
    FROM mailboxes m
    WHERE lower(m.email_address) = lower(?)
    `
  )
    .bind(toAddress)
    .first<{ mailbox_id: string; tenant_id: string } | null>();

  return mailbox;
}

/**
 * Find existing conversation by threading headers or create a new one.
 */
async function findOrCreateConversation(
  env: Env,
  params: {
    tenantId: string;
    mailboxId: string;
    subject: string;
    customerEmail: string;
    inReplyTo?: string | null;
    references?: string | null;
  }
): Promise<string> {
  const now = new Date().toISOString();

  // 1) Try to find existing conversation via In-Reply-To
  if (params.inReplyTo) {
    const parent = await env.DB.prepare(
      `
      SELECT conversation_id
      FROM emails
      WHERE message_id = ?
      LIMIT 1
      `
    )
      .bind(params.inReplyTo)
      .first<{ conversation_id: string } | null>();

    if (parent) {
      console.log(`[EmailHandler] Found existing conversation via In-Reply-To: ${parent.conversation_id}`);
      return parent.conversation_id;
    }
  }

  // 2) Try to find via References header
  if (params.references) {
    const refIds = params.references.split(/\s+/);
    for (const ref of refIds) {
      const parent = await env.DB.prepare(
        `
        SELECT conversation_id
        FROM emails
        WHERE message_id = ?
        LIMIT 1
        `
      )
        .bind(ref)
        .first<{ conversation_id: string } | null>();

      if (parent) {
        console.log(`[EmailHandler] Found existing conversation via References: ${parent.conversation_id}`);
        return parent.conversation_id;
      }
    }
  }

  // 3) No existing conversation found - create new one
  const conversationId = crypto.randomUUID();
  console.log(`[EmailHandler] Creating new conversation: ${conversationId}`);

  await env.DB.prepare(
    `
    INSERT INTO conversations (
      id, tenant_id, mailbox_id, subject, customer_email, status, last_message_at, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, 'open', ?, ?
    )
    `
  )
    .bind(
      conversationId,
      params.tenantId,
      params.mailboxId,
      params.subject,
      params.customerEmail,
      now,
      now
    )
    .run();

  return conversationId;
}

/**
 * Store inbound email in database.
 */
async function insertInboundEmail(
  env: Env,
  data: {
    tenantId: string;
    conversationId: string;
    mailboxId: string;
    messageId: string;
    inReplyTo?: string | null;
    references?: string | null;
    fromName: string | null;
    fromEmail: string;
    toEmail: string;
    subject: string;
    bodyText: string;
    bodyHtml: string | null;
    rawHeaders: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const emailId = crypto.randomUUID();

  console.log(`[EmailHandler] Storing inbound email: ${emailId}`);

  await env.DB.prepare(
    `
    INSERT INTO emails (
      id,
      tenant_id,
      conversation_id,
      mailbox_id,
      direction,
      user_id,
      message_id,
      in_reply_to,
      references_header,
      from_name,
      from_email,
      to_email,
      cc,
      bcc,
      subject,
      body_text,
      body_html,
      raw_headers,
      received_at,
      status
    ) VALUES (
      ?, ?, ?, ?, 'inbound',
      NULL,
      ?, ?, ?,
      ?, ?, ?,
      NULL, NULL,
      ?, ?, ?, ?,
      ?, 'ok'
    )
    `
  )
    .bind(
      emailId,
      data.tenantId,
      data.conversationId,
      data.mailboxId,
      data.messageId,
      data.inReplyTo || null,
      data.references || null,
      data.fromName,
      data.fromEmail,
      data.toEmail,
      data.subject,
      data.bodyText,
      data.bodyHtml,
      data.rawHeaders,
      now
    )
    .run();

  // Update conversation timestamp
  await env.DB.prepare(
    `
    UPDATE conversations
    SET last_message_at = ?, updated_at = ?
    WHERE id = ?
    `
  )
    .bind(now, now, data.conversationId)
    .run();

  console.log(`[EmailHandler] ✅ Email stored successfully`);
}

/**
 * Create or update ticket in the customer service system using TicketManager
 */
async function createOrUpdateTicket(
  env: Env,
  opts: {
    conversationId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    messageContent: string;
    isReply: boolean;
  }
): Promise<void> {
  try {
    // Initialize TicketManager
    const ticketManager = new TicketManager(env.DB);

    // Check if ticket already exists for this conversation
    const existingTicket = await env.DB.prepare(`
      SELECT ticket_id FROM tickets WHERE conversation_id = ?
    `)
      .bind(opts.conversationId)
      .first<{ ticket_id: string }>();

    if (existingTicket) {
      // This is a reply to an existing ticket - add as a customer message
      console.log(`[EmailHandler] Adding customer reply to ticket ${existingTicket.ticket_id}`);
      
      await ticketManager.addMessage(existingTicket.ticket_id, {
        content: opts.messageContent,
        sender_type: 'customer',
        sender_name: opts.customerName,
      });

      // Update ticket timestamp and status
      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE tickets SET updated_at = ?, status = 'open' WHERE ticket_id = ?
      `)
        .bind(now, existingTicket.ticket_id)
        .run();
    } else {
      // New ticket - create it using TicketManager
      console.log(`[EmailHandler] Creating new ticket for conversation ${opts.conversationId}`);
      
      // Create customer if doesn't exist
      const customerId = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(`
        INSERT OR IGNORE INTO customers (id, email, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
        .bind(customerId, opts.customerEmail, opts.customerName, now, now)
        .run();

      // Get customer ID
      const customer = await env.DB.prepare(`
        SELECT id FROM customers WHERE email = ?
      `)
        .bind(opts.customerEmail)
        .first<{ id: string }>();

      // Create normalized message for TicketManager
      const normalizedMessage: NormalizedMessage = {
        id: crypto.randomUUID(),
        channelType: 'email',
        direction: 'inbound',
        customerId: customer?.id || customerId,
        customerEmail: opts.customerEmail,
        customerName: opts.customerName,
        content: opts.messageContent,
        metadata: {
          channelMessageId: opts.conversationId,
          timestamp: now,
        },
      };

      // Use TicketManager to create ticket (it will auto-detect priority, category, sentiment)
      const ticket = await ticketManager.createTicket(normalizedMessage, {
        subject: opts.subject,
      });

      // Link ticket to conversation
      await env.DB.prepare(`
        UPDATE tickets SET conversation_id = ? WHERE ticket_id = ?
      `)
        .bind(opts.conversationId, ticket.ticket_id)
        .run();

      console.log(`[EmailHandler] ✅ Created ticket ${ticket.ticket_number} with priority: ${ticket.priority}, sentiment: ${ticket.sentiment}`);
    }
  } catch (error) {
    console.error('[EmailHandler] Error creating/updating ticket:', error);
    // Don't throw - we still want to store the email even if ticket creation fails
  }
}

/**
 * Main email handler - called by Cloudflare Email Worker
 */
export async function handleInboundEmail(message: EmailMessage, env: Env): Promise<void> {
  try {
    console.log(`[EmailHandler] Processing inbound email from: ${message.from}`);

    // Get recipient address - handle both string and array formats
    let to: string;
    if (typeof message.to === 'string') {
      // Cloudflare sends it as a string
      to = message.to;
    } else if (Array.isArray(message.to) && message.to.length > 0) {
      // If it's an array, get first element
      const toRaw = message.to[0];
      to = typeof toRaw === 'string' ? toRaw : (toRaw as any).address || toRaw;
    } else {
      console.warn('[EmailHandler] Email missing "to" address');
      return;
    }

    console.log(`[EmailHandler] To: ${to}`);

    // Look up mailbox and tenant
    const mailbox = await resolveMailboxAndTenant(env, to);
    if (!mailbox) {
      console.warn(`[EmailHandler] No mailbox configured for address: ${to}`);
      return;
    }

    console.log(`[EmailHandler] Mailbox: ${mailbox.mailbox_id}, Tenant: ${mailbox.tenant_id}`);

    // Parse email
    const { headersText, bodyText, bodyHtml } = await parseRawMime(message.raw);

    // Extract headers
    const headers = message.headers;
    const subject = headers.get('subject') || '(no subject)';
    const messageId = headers.get('message-id') || `<${crypto.randomUUID()}@mail.system>`;
    const inReplyTo = headers.get('in-reply-to') || null;
    const references = headers.get('references') || null;
    const fromHeader = headers.get('from') || message.from;

    console.log(`[EmailHandler] Subject: ${subject}`);
    console.log(`[EmailHandler] Message-ID: ${messageId}`);
    if (inReplyTo) console.log(`[EmailHandler] In-Reply-To: ${inReplyTo}`);

    // Parse from address
    const from = parseAddress(fromHeader);
    const fromEmail = from.email;
    if (!fromEmail) {
      console.warn('[EmailHandler] Could not determine fromEmail');
      return;
    }

    console.log(`[EmailHandler] From: ${from.name} <${fromEmail}>`);

    // Find or create conversation
    const conversationId = await findOrCreateConversation(env, {
      tenantId: mailbox.tenant_id,
      mailboxId: mailbox.mailbox_id,
      subject,
      customerEmail: fromEmail,
      inReplyTo,
      references,
    });

    // Store email
    await insertInboundEmail(env, {
      tenantId: mailbox.tenant_id,
      conversationId,
      mailboxId: mailbox.mailbox_id,
      messageId,
      inReplyTo,
      references,
      fromName: from.name,
      fromEmail,
      toEmail: to,
      subject,
      bodyText,
      bodyHtml,
      rawHeaders: headersText,
    });

    // Create or update ticket for customer service dashboard
    await createOrUpdateTicket(env, {
      conversationId,
      customerEmail: fromEmail,
      customerName: from.name || fromEmail,
      subject,
      messageContent: bodyText || bodyHtml || '',
      isReply: !!inReplyTo, // If it has In-Reply-To, it's a reply to existing ticket
    });

    console.log(`[EmailHandler] ✅ Email processed successfully`);
  } catch (err) {
    console.error('[EmailHandler] Error handling inbound email:', err);
    throw err;
  }
}

