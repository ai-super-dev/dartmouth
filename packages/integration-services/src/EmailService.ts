/**
 * EmailService - Email Integration
 * 
 * Supports multiple providers:
 * - gmail: Google Gmail API
 * - smtp: Generic SMTP (for other providers)
 * 
 * @example
 * ```typescript
 * const emailService = new EmailService(config);
 * await emailService.send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   body: 'This is a test email'
 * });
 * ```
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type {
  EmailMessage,
  EmailListOptions,
  EmailServiceConfig,
  EmailSendResult,
  EmailDraftResult
} from './types';

export class EmailService {
  private config: EmailServiceConfig;
  private gmail: ReturnType<typeof google.gmail> | null = null;
  private oauth2Client: OAuth2Client | null = null;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (config.provider === 'gmail') {
      if (!config.clientId || !config.clientSecret || !config.refreshToken) {
        throw new Error('Gmail provider requires clientId, clientSecret, and refreshToken');
      }

      this.oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret
      );
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken
      });
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }
  }

  /**
   * List email messages
   * @param options - List options
   * @returns Array of email messages
   */
  async listMessages(options: EmailListOptions = {}): Promise<any[]> {
    if (this.config.provider !== 'gmail') {
      throw new Error('List messages only supported for Gmail provider');
    }

    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    try {
      const query = this.buildGmailQuery(options);
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 20,
        q: query,
        pageToken: options.pageToken
      });

      // Fetch full message details
      const messages = await Promise.all(
        (response.data.messages || []).map(async (msg: any) => {
          const full = await this.gmail!.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });
          return this.parseGmailMessage(full.data);
        })
      );

      return messages;
    } catch (error) {
      console.error('Failed to list emails:', error);
      throw new Error(`Email list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send an email
   * @param message - Email message details
   * @returns Message ID and status
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Validate required fields
    if (!message.to) {
      throw new Error('Recipient (to) is required');
    }
    if (!message.subject) {
      throw new Error('Subject is required');
    }
    if (!message.body) {
      throw new Error('Body is required');
    }

    if (this.config.provider === 'gmail') {
      return await this.sendViaGmail(message);
    } else {
      return await this.sendViaSMTP(message);
    }
  }

  /**
   * Create a draft email
   * @param message - Email message details
   * @returns Draft ID
   */
  async createDraft(message: EmailMessage): Promise<EmailDraftResult> {
    if (this.config.provider !== 'gmail') {
      throw new Error('Drafts only supported for Gmail provider');
    }

    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    try {
      const raw = this.createRawEmail(message);
      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: { raw }
        }
      });

      return {
        draftId: response.data.id || '',
        messageId: response.data.message?.id || undefined
      };
    } catch (error) {
      console.error('Failed to create draft:', error);
      throw new Error(`Draft creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send email via Gmail API
   */
  private async sendViaGmail(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    try {
      const raw = this.createRawEmail(message);
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });

      return {
        messageId: response.data.id || '',
        threadId: response.data.threadId || undefined,
        status: 'sent'
      };
    } catch (error) {
      console.error('Gmail send failed:', error);
      throw new Error(`Gmail send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(_message: EmailMessage): Promise<EmailSendResult> {
    // SMTP implementation would go here
    // For now, throw error indicating it's not implemented
    throw new Error('SMTP provider not yet implemented');
  }

  /**
   * Create raw email for Gmail API
   */
  private createRawEmail(message: EmailMessage): string {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    const cc = message.cc?.join(', ') || '';
    const bcc = message.bcc?.join(', ') || '';

    const email = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${message.subject}`,
      message.replyTo ? `Reply-To: ${message.replyTo}` : '',
      message.from ? `From: ${message.from}` : '',
      `Content-Type: ${message.bodyType === 'html' ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      message.body
    ].filter(Boolean).join('\r\n');

    // Convert to base64url encoding (RFC 4648 §5)
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Build Gmail query string
   */
  private buildGmailQuery(options: EmailListOptions): string {
    const parts: string[] = [];

    if (options.folder) {
      const folderMap: Record<string, string> = {
        inbox: 'in:inbox',
        sent: 'in:sent',
        drafts: 'in:drafts',
        trash: 'in:trash',
        spam: 'in:spam'
      };
      parts.push(folderMap[options.folder] || '');
    }

    if (options.unreadOnly) {
      parts.push('is:unread');
    }

    if (options.query) {
      parts.push(options.query);
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Parse Gmail message to our format
   */
  private parseGmailMessage(gmailMessage: any): any {
    const headers = gmailMessage.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: gmailMessage.id,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: gmailMessage.snippet
    };
  }

  /**
   * Check health of Email service
   */
  async checkHealth(): Promise<'operational' | 'degraded' | 'down'> {
    try {
      if (this.config.provider === 'gmail' && this.gmail) {
        await this.gmail.users.getProfile({ userId: 'me' });
        return 'operational';
      }
      return 'degraded';
    } catch {
      return 'down';
    }
  }
}

