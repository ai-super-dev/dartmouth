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
 * Convert HTML to plain text while preserving line breaks
 */
function htmlToText(html: string): string {
  console.log(`[htmlToText] ═══════════════════════════════════════════`);
  console.log(`[htmlToText] INPUT length=${html.length}`);
  console.log(`[htmlToText] INPUT html:\n${html.substring(0, 500)}`);
  console.log(`[htmlToText] ───────────────────────────────────────────`);
  
  let text = html
    // Remove style and script blocks first
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Handle double <br> as paragraph break (common in emails like Proton Mail)
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
    // Handle block-level elements that should create paragraph breaks
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')  // </p><p> = paragraph break
    .replace(/<p[^>]*>/gi, '')               // Opening <p> tags
    .replace(/<\/p>/gi, '\n\n')              // Closing </p> tags
    .replace(/<br\s*\/?>/gi, '\n')           // Single <br> tags = line break
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n\n') // </div><div> = paragraph break
    .replace(/<div[^>]*>/gi, '')             // Opening <div> tags
    .replace(/<\/div>/gi, '\n')              // Closing </div> tags
    .replace(/<\/h[1-6]>/gi, '\n\n')         // Heading closings
    .replace(/<h[1-6][^>]*>/gi, '')          // Heading openings
    .replace(/<\/li>/gi, '\n')               // List items
    .replace(/<li[^>]*>/gi, '• ')            // List item bullets
    .replace(/<\/tr>/gi, '\n')               // Table rows
    .replace(/<\/td>/gi, ' ')                // Table cells = space
    .replace(/<\/th>/gi, ' ')                // Table headers = space
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10))) // Numeric entities
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Clean up excessive whitespace but preserve paragraph structure
    .replace(/[ \t]+/g, ' ')                 // Multiple spaces/tabs to single space
    .replace(/\n /g, '\n')                   // Remove space after newline
    .replace(/ \n/g, '\n')                   // Remove space before newline
    .replace(/\n{3,}/g, '\n\n')              // Max 2 consecutive newlines
    .trim();
  
  console.log(`[htmlToText] OUTPUT length=${text.length} newlines=${(text.match(/\n/g) || []).length}`);
  console.log(`[htmlToText] OUTPUT text:\n${text.substring(0, 500)}`);
  console.log(`[htmlToText] ═══════════════════════════════════════════`);
  
  return text;
}

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
          console.log('[EmailHandler] Plain text body extracted:', {
            length: bodyText.length,
            hasNewlines: bodyText.includes('\n'),
            hasCarriageReturns: bodyText.includes('\r'),
            preview: bodyText.substring(0, 100)
          });
        } else if (partContentType.includes('text/html') && !bodyHtml) {
          bodyHtml = decodedContent;
          console.log('[EmailHandler] HTML body extracted:', {
            length: bodyHtml.length,
            preview: bodyHtml.substring(0, 100)
          });
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
    bodyText = hasHtmlTags ? htmlToText(decodedBody) : decodedBody;
    bodyHtml = hasHtmlTags ? decodedBody : null;
  }

  // If we have HTML but no text, extract text from HTML
  if (bodyHtml && !bodyText) {
    bodyText = htmlToText(bodyHtml);
  }

  // If we have both HTML and plain text, check if HTML has better structure
  // (Some email clients send plain text with newlines only at the end, not between paragraphs)
  if (bodyHtml && bodyText) {
    const plainTextNewlines = (bodyText.match(/\n/g) || []).length;
    const htmlBreaks = (bodyHtml.match(/<br\s*\/?>/gi) || []).length;
    const htmlParagraphs = (bodyHtml.match(/<\/p>/gi) || []).length;
    const htmlDivs = (bodyHtml.match(/<\/div>/gi) || []).length;
    const htmlStructure = htmlBreaks + htmlParagraphs + htmlDivs;
    
    console.log(`[EmailHandler] ═══════════════════════════════════════════`);
    console.log(`[EmailHandler] COMPARING: plainTextNewlines=${plainTextNewlines} vs htmlStructure=${htmlStructure} (br=${htmlBreaks} p=${htmlParagraphs} div=${htmlDivs})`);
    console.log(`[EmailHandler] DECISION: ${htmlStructure > plainTextNewlines ? 'USE HTML' : 'USE PLAIN TEXT'}`);
    console.log(`[EmailHandler] ═══════════════════════════════════════════`);
    
    // If HTML has more structural elements than plain text has newlines, use HTML
    if (htmlStructure > plainTextNewlines) {
      bodyText = htmlToText(bodyHtml);
    }
  }

  // Normalize line endings and ensure proper paragraph breaks
  if (bodyText) {
    bodyText = bodyText
      .replace(/\r\n/g, '\n')  // Convert Windows line endings to Unix
      .replace(/\r/g, '\n')     // Convert old Mac line endings to Unix
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .trim();
    
    console.log(`[EmailHandler] ═══════════════════════════════════════════`);
    console.log(`[EmailHandler] FINAL BODY length=${bodyText.length} newlines=${(bodyText.match(/\n/g) || []).length}`);
    console.log(`[EmailHandler] FINAL BODY text:\n${bodyText.substring(0, 500)}`);
    console.log(`[EmailHandler] ═══════════════════════════════════════════`);
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
      // New ticket - but first check for duplicates
      console.log(`[EmailHandler] Checking for duplicate tickets before creating new one...`);
      
      // Check for duplicate ticket (same customer, same subject/content within 24 hours)
      const duplicateResult = await ticketManager.checkForDuplicate(
        opts.customerEmail,
        opts.subject,
        opts.messageContent
      );
      
      if (duplicateResult) {
        const { ticket: duplicateTicket, isExactDuplicate } = duplicateResult;
        
        if (isExactDuplicate) {
          // Exact duplicate - auto-archive, don't create new ticket
          console.log(`[EmailHandler] EXACT duplicate detected: ${duplicateTicket.ticket_number} - auto-archiving`);
          
          // Add system note to existing ticket
          await ticketManager.addMessage(duplicateTicket.ticket_id, {
            sender_type: 'system',
            sender_id: 'system',
            sender_name: 'System',
            content: `[Auto-Archived] Exact duplicate email received from ${opts.customerName || opts.customerEmail} and automatically archived.`
          });
          
          console.log(`[EmailHandler] ✅ Duplicate archived - linked to existing ticket ${duplicateTicket.ticket_number}`);
          return; // Don't create new ticket
        } else {
          // Similar but not exact - add as follow-up to existing ticket
          console.log(`[EmailHandler] Similar ticket detected: ${duplicateTicket.ticket_number} - adding as follow-up`);
          
          await ticketManager.addMessage(duplicateTicket.ticket_id, {
            sender_type: 'customer',
            sender_id: opts.customerEmail,
            sender_name: opts.customerName || opts.customerEmail,
            content: `[Follow-up] ${opts.messageContent}`
          });
          
          // Reopen ticket if it was closed/resolved
          await env.DB.prepare(`
            UPDATE tickets SET updated_at = ?, status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END WHERE ticket_id = ?
          `).bind(new Date().toISOString(), duplicateTicket.ticket_id).run();
          
          console.log(`[EmailHandler] ✅ Follow-up added to existing ticket ${duplicateTicket.ticket_number}`);
          return; // Don't create new ticket
        }
      }
      
      // No duplicate found - create new ticket
      console.log(`[EmailHandler] No duplicate found - creating new ticket for conversation ${opts.conversationId}`);
      
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

      // Process ticket with AI Agent to generate draft response
      try {
        console.log(`[EmailHandler] Processing ticket ${ticket.ticket_number} with AI Agent...`);
        console.log(`[EmailHandler] AI Agent environment check:`, {
          hasDB: !!env.DB,
          hasWorkersAI: !!(env as any).WORKERS_AI,
          hasOpenAIKey: !!(env as any).OPENAI_API_KEY,
        });
        
        const { AIAgentProcessor } = await import('./AIAgentProcessor');
        console.log(`[EmailHandler] AIAgentProcessor imported successfully`);
        
        const aiProcessor = new AIAgentProcessor(env as any, {
          enabled: true,
          mode: 'draft', // Always generate drafts for approval
        });
        console.log(`[EmailHandler] AIAgentProcessor instantiated`);

        const aiResult = await aiProcessor.processTicket(
          ticket.ticket_id,
          ticket.ticket_number,
          opts.customerEmail,
          opts.customerName,
          opts.subject,
          opts.messageContent,
          ticket.priority,
          ticket.sentiment,
          ticket.category || 'general',
          []
        );

        console.log(`[EmailHandler] AI processing result:`, {
          success: aiResult.success,
          hasDraftContent: !!aiResult.draftContent,
          confidenceScore: aiResult.confidenceScore,
          shouldEscalate: aiResult.shouldEscalate,
          error: aiResult.error,
          handler: aiResult.handler
        });

        if (aiResult.success && aiResult.draftContent) {
          // Store AI draft response
          const draftId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO ai_draft_responses (
              id, ticket_id, draft_content, confidence_score, intent, handler_used,
              reasoning, suggested_actions, status, should_escalate, escalation_reason,
              shopify_data, perp_data, processing_time_ms, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            draftId,
            ticket.ticket_id,
            aiResult.draftContent,
            aiResult.confidenceScore || 0.5,
            aiResult.intent || 'unknown',
            aiResult.handler || 'unknown',
            aiResult.reasoning || '',
            JSON.stringify(aiResult.suggestedActions || []),
            aiResult.shouldEscalate ? 1 : 0,
            aiResult.escalationReason || null,
            aiResult.metadata?.shopifyData ? JSON.stringify(aiResult.metadata.shopifyData) : null,
            aiResult.metadata?.perpData ? JSON.stringify(aiResult.metadata.perpData) : null,
            aiResult.metadata?.processingTimeMs || 0
          ).run();

          console.log(`[EmailHandler] ✅ Generated AI draft for ticket ${ticket.ticket_number} (confidence: ${Math.round((aiResult.confidenceScore || 0) * 100)}%)`);

          // If should escalate, mark ticket for escalation
          if (aiResult.shouldEscalate) {
            console.log(`[EmailHandler] ⚠️ Ticket ${ticket.ticket_number} flagged for escalation: ${aiResult.escalationReason}`);
          }
        } else if (aiResult.error) {
          console.error(`[EmailHandler] AI processing failed for ticket ${ticket.ticket_number}:`, aiResult.error);
        }
      } catch (aiError) {
        console.error(`[EmailHandler] Error processing ticket with AI:`, aiError);
        // Don't throw - ticket was created successfully, AI is optional
      }
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

