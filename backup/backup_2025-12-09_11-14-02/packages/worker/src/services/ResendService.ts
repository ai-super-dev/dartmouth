/**
 * Resend Service for Outbound Email
 * Sends emails via Resend API with proper threading headers
 */

export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export interface SendEmailOptions {
  tenantId: string;
  conversationId: string;
  mailboxId: string;
  userId: string;            // Staff member sending this email
  toEmail: string;
  fromEmail: string;         // e.g. "support@customerdomain.com"
  fromName?: string;         // e.g. "Amazing Transfers Support"
  subject: string;
  bodyHtml: string;          // Already includes signature
  bodyText?: string;         // Optional plain text override
}

/**
 * Fetch the latest email in a conversation for threading.
 */
async function getLatestEmailForThread(
  env: Env,
  tenantId: string,
  conversationId: string
): Promise<{ message_id: string; references_header: string | null } | null> {
  const row = await env.DB.prepare(
    `
    SELECT message_id, references_header
    FROM emails
    WHERE tenant_id = ? AND conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `
  )
    .bind(tenantId, conversationId)
    .first<{ message_id: string; references_header: string | null } | null>();

  return row;
}

/**
 * Insert outbound email record into D1.
 */
async function insertOutboundEmail(
  env: Env,
  opts: {
    tenantId: string;
    conversationId: string;
    mailboxId: string;
    userId: string;
    messageId: string;
    inReplyTo: string | null;
    references: string | null;
    fromName: string | null;
    fromEmail: string;
    toEmail: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
    status: string;
    bounceReason: string | null;
  }
): Promise<void> {
  const emailId = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO emails (
      id, tenant_id, conversation_id, mailbox_id, direction, user_id,
      message_id, in_reply_to, references_header,
      from_name, from_email, to_email,
      subject, body_text, body_html,
      sent_at, status, bounce_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      emailId,
      opts.tenantId,
      opts.conversationId,
      opts.mailboxId,
      opts.userId,
      opts.messageId,
      opts.inReplyTo,
      opts.references,
      opts.fromName,
      opts.fromEmail,
      opts.toEmail,
      opts.subject,
      opts.bodyText,
      opts.bodyHtml,
      now,
      opts.status,
      opts.bounceReason,
      now,
      now
    )
    .run();
}

/**
 * Check if tenant has exceeded daily email quota.
 */
async function checkQuota(env: Env, tenantId: string): Promise<boolean> {
  const quota = await env.DB.prepare(
    `
    SELECT daily_limit, used_today, last_reset_at
    FROM tenant_email_quota
    WHERE tenant_id = ?
    `
  )
    .bind(tenantId)
    .first<{ daily_limit: number; used_today: number; last_reset_at: string } | null>();

  if (!quota) {
    // No quota record - create one
    const now = new Date().toISOString();
    await env.DB.prepare(
      `
      INSERT INTO tenant_email_quota (tenant_id, daily_limit, used_today, last_reset_at)
      VALUES (?, 1000, 0, ?)
      `
    )
      .bind(tenantId, now)
      .run();
    return true;
  }

  // Check if we need to reset daily counter
  const lastReset = new Date(quota.last_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    // Reset counter
    await env.DB.prepare(
      `
      UPDATE tenant_email_quota
      SET used_today = 0, last_reset_at = ?
      WHERE tenant_id = ?
      `
    )
      .bind(now.toISOString(), tenantId)
      .run();
    return true;
  }

  // Check if under limit
  return quota.used_today < quota.daily_limit;
}

/**
 * Increment daily quota counter.
 */
async function incrementQuota(env: Env, tenantId: string): Promise<void> {
  await env.DB.prepare(
    `
    UPDATE tenant_email_quota
    SET used_today = used_today + 1
    WHERE tenant_id = ?
    `
  )
    .bind(tenantId)
    .run();
}

/**
 * Strip HTML tags for plain text version.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Extract domain from email address.
 */
function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : 'localhost';
}

/**
 * Main function to send an email via Resend with proper threading.
 */
export async function sendEmailThroughResend(
  env: Env,
  opts: SendEmailOptions
): Promise<void> {
  console.log(`[Resend] Sending email to ${opts.toEmail}`);

  // 1) Check quota
  const canSend = await checkQuota(env, opts.tenantId);
  if (!canSend) {
    console.error(`[Resend] Tenant ${opts.tenantId} has exceeded daily email quota`);
    throw new Error('Daily email quota exceeded');
  }

  // 2) Get previous email for threading
  const prevEmail = await getLatestEmailForThread(env, opts.tenantId, opts.conversationId);

  let inReplyTo: string | null = null;
  let references: string | null = null;

  if (prevEmail) {
    inReplyTo = prevEmail.message_id;
    // Build references chain
    if (prevEmail.references_header) {
      references = `${prevEmail.references_header} ${prevEmail.message_id}`;
    } else {
      references = prevEmail.message_id;
    }
    console.log(`[Resend] Threading - In-Reply-To: ${inReplyTo}`);
    console.log(`[Resend] Threading - References: ${references}`);
  } else {
    console.log(`[Resend] No previous messages - starting new thread`);
  }

  // 3) Generate new Message-ID with tenant's domain
  const domain = extractDomain(opts.fromEmail);
  const newMessageId = `<${crypto.randomUUID()}@${domain}>`;
  console.log(`[Resend] New Message-ID: ${newMessageId}`);

  // 4) Build Resend payload
  const payload: any = {
    from: opts.fromName ? `${opts.fromName} <${opts.fromEmail}>` : opts.fromEmail,
    to: [opts.toEmail],
    subject: opts.subject,
    html: opts.bodyHtml,
    text: opts.bodyText || stripHtml(opts.bodyHtml),
    headers: {
      'Message-ID': newMessageId,
    },
  };

  // Add threading headers if replying
  if (inReplyTo) {
    payload.headers['In-Reply-To'] = inReplyTo;
  }
  if (references) {
    payload.headers['References'] = references;
  }

  // 5) Send via Resend API
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const ok = res.status >= 200 && res.status < 300;
  const responseText = await res.text().catch(() => '');

  console.log(`[Resend] Response: ${res.status} ${responseText}`);

  // 6) Store outbound email record in D1
  await insertOutboundEmail(env, {
    tenantId: opts.tenantId,
    conversationId: opts.conversationId,
    mailboxId: opts.mailboxId,
    userId: opts.userId,
    messageId: newMessageId,
    inReplyTo,
    references,
    fromName: opts.fromName || null,
    fromEmail: opts.fromEmail,
    toEmail: opts.toEmail,
    subject: opts.subject,
    bodyText: opts.bodyText || stripHtml(opts.bodyHtml),
    bodyHtml: opts.bodyHtml,
    status: ok ? 'ok' : 'failed',
    bounceReason: ok ? null : `HTTP ${res.status}: ${responseText}`,
  });

  // 7) Increment quota
  if (ok) {
    await incrementQuota(env, opts.tenantId);
  }

  if (!ok) {
    throw new Error(`Resend send failed: ${res.status} ${responseText}`);
  }

  console.log(`[Resend] ✅ Email sent successfully`);
}

