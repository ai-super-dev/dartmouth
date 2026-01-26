/**
 * EmailService - Email Integration (Cloudflare Workers Compatible)
 * 
 * Supports multiple providers:
 * - gmail: Google Gmail API (using REST API directly)
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

import type {
  EmailMessage,
  EmailListOptions,
  EmailServiceConfig,
  EmailSendResult,
  EmailDraftResult
} from './types';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GmailMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

export class EmailService {
  private config: EmailServiceConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly API_BASE = 'https://gmail.googleapis.com/gmail/v1';

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (config.provider === 'gmail') {
      if (!config.clientId || !config.clientSecret || !config.refreshToken) {
        throw new Error('Gmail provider requires clientId, clientSecret, and refreshToken');
      }
    }
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.config.provider !== 'gmail') {
      throw new Error('Access token only available for Gmail provider');
    }

    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    // Refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        refresh_token: this.config.refreshToken!,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.config.provider !== 'gmail') {
      throw new Error('API requests only available for Gmail provider');
    }

    const token = await this.getAccessToken();
    const url = `${this.API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
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

    try {
      const query = this.buildGmailQuery(options);
      const params = new URLSearchParams();
      params.set('maxResults', String(options.maxResults || 20));
      if (query) params.set('q', query);
      if (options.pageToken) params.set('pageToken', options.pageToken);

      const response = await this.apiRequest<{ messages?: Array<{ id: string }>, nextPageToken?: string }>(
        `/users/me/messages?${params.toString()}`
      );

      // Fetch full message details
      const messages = await Promise.all(
        (response.messages || []).map(async (msg) => {
          const full = await this.apiRequest<GmailMessage>(
            `/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
          );
          return this.parseGmailMessage(full);
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

    try {
      const raw = this.createRawEmail(message);
      const response = await this.apiRequest<{ id?: string; message?: { id?: string } }>(
        '/users/me/drafts',
        {
          method: 'POST',
          body: JSON.stringify({
            message: { raw }
          }),
        }
      );

      return {
        draftId: response.id || '',
        messageId: response.message?.id || undefined
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
    try {
      const raw = this.createRawEmail(message);
      const response = await this.apiRequest<{ id?: string; threadId?: string }>(
        '/users/me/messages/send',
        {
          method: 'POST',
          body: JSON.stringify({ raw }),
        }
      );

      return {
        messageId: response.id || '',
        threadId: response.threadId || undefined,
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
    // In Cloudflare Workers, we use TextEncoder/TextDecoder instead of Buffer
    const encoder = new TextEncoder();
    const bytes = encoder.encode(email);
    let base64 = '';
    
    // Manual base64 encoding (Workers-compatible)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i];
      const b2 = bytes[i + 1] || 0;
      const b3 = bytes[i + 2] || 0;
      
      const bitmap = (b1 << 16) | (b2 << 8) | b3;
      
      base64 += chars.charAt((bitmap >> 18) & 63);
      base64 += chars.charAt((bitmap >> 12) & 63);
      base64 += i + 1 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      base64 += i + 2 < bytes.length ? chars.charAt(bitmap & 63) : '=';
    }

    // Convert to base64url (RFC 4648 §5)
    return base64
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
  private parseGmailMessage(gmailMessage: GmailMessage): any {
    const headers = gmailMessage.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

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
      if (this.config.provider === 'gmail') {
        await this.apiRequest('/users/me/profile');
        return 'operational';
      }
      return 'degraded';
    } catch {
      return 'down';
    }
  }
}
