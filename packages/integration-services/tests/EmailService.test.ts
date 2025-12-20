import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../src/EmailService';

// Mock googleapis
vi.mock('googleapis', () => {
  const mockGmail = {
    users: {
      messages: {
        list: vi.fn(),
        get: vi.fn(),
        send: vi.fn()
      },
      drafts: {
        create: vi.fn()
      },
      getProfile: vi.fn()
    }
  };

  const MockOAuth2Client = vi.fn().mockImplementation(() => ({
    setCredentials: vi.fn()
  }));

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2Client,
        OAuth2Client: MockOAuth2Client
      },
      gmail: vi.fn(() => mockGmail)
    }
  };
});

describe('EmailService', () => {
  let emailService: EmailService;
  const mockGmailConfig = {
    provider: 'gmail' as const,
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token'
  };

  beforeEach(() => {
    emailService = new EmailService(mockGmailConfig);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if Gmail provider missing credentials', () => {
      expect(() => {
        new EmailService({
          provider: 'gmail',
          clientId: '',
          clientSecret: '',
          refreshToken: ''
        });
      }).toThrow('Gmail provider requires clientId, clientSecret, and refreshToken');
    });
  });

  describe('send', () => {
    it('should throw error if recipient is missing', async () => {
      await expect(
        emailService.send({
          to: '',
          subject: 'Test',
          body: 'Test body'
        })
      ).rejects.toThrow('Recipient (to) is required');
    });

    it('should throw error if subject is missing', async () => {
      await expect(
        emailService.send({
          to: 'recipient@example.com',
          subject: '',
          body: 'Test body'
        })
      ).rejects.toThrow('Subject is required');
    });

    it('should throw error if body is missing', async () => {
      await expect(
        emailService.send({
          to: 'recipient@example.com',
          subject: 'Test',
          body: ''
        })
      ).rejects.toThrow('Body is required');
    });

    it('should send email with valid data', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.messages.send.mockResolvedValue({
        data: {
          id: 'msg123',
          threadId: 'thread456'
        }
      });

      const result = await emailService.send({
        to: 'recipient@example.com',
        subject: 'Test Email',
        body: 'Test body',
        bodyType: 'text'
      });

      expect(result).toHaveProperty('messageId');
      expect(result.status).toBe('sent');
      expect(mockGmail.users.messages.send).toHaveBeenCalled();
    });

    it('should send email with multiple recipients', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'msg123' }
      });

      const result = await emailService.send({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Email',
        body: 'Test body'
      });

      expect(result.status).toBe('sent');
    });

    it('should send HTML email', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'msg123' }
      });

      const result = await emailService.send({
        to: 'recipient@example.com',
        subject: 'HTML Email',
        body: '<h1>Hello</h1><p>This is HTML</p>',
        bodyType: 'html'
      });

      expect(result.status).toBe('sent');
    });

    it('should throw error for SMTP provider (not implemented)', async () => {
      const smtpService = new EmailService({
        provider: 'smtp',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password'
      });

      await expect(
        smtpService.send({
          to: 'recipient@example.com',
          subject: 'Test',
          body: 'Test body'
        })
      ).rejects.toThrow('SMTP provider not yet implemented');
    });
  });

  describe('createDraft', () => {
    it('should create draft with valid data', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.drafts.create.mockResolvedValue({
        data: {
          id: 'draft123',
          message: { id: 'msg123' }
        }
      });

      const result = await emailService.createDraft({
        to: 'recipient@example.com',
        subject: 'Draft Email',
        body: 'Draft body'
      });

      expect(result).toHaveProperty('draftId');
      expect(result.draftId).toBe('draft123');
      expect(mockGmail.users.drafts.create).toHaveBeenCalled();
    });

    it('should throw error for SMTP provider', async () => {
      const smtpService = new EmailService({
        provider: 'smtp',
        smtpHost: 'smtp.example.com'
      });

      await expect(
        smtpService.createDraft({
          to: 'recipient@example.com',
          subject: 'Test',
          body: 'Test body'
        })
      ).rejects.toThrow('Drafts only supported for Gmail provider');
    });
  });

  describe('listMessages', () => {
    it('should list messages from inbox', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.messages.list.mockResolvedValue({
        data: {
          messages: [
            { id: 'msg1' },
            { id: 'msg2' }
          ]
        }
      });

      mockGmail.users.messages.get.mockImplementation((params: any) => {
        return Promise.resolve({
          data: {
            id: params.id,
            snippet: 'Test snippet',
            payload: {
              headers: [
                { name: 'From', value: 'sender@example.com' },
                { name: 'To', value: 'recipient@example.com' },
                { name: 'Subject', value: 'Test Subject' },
                { name: 'Date', value: 'Mon, 16 Dec 2025 10:00:00 +0000' }
              ]
            }
          }
        });
      });

      const messages = await emailService.listMessages({
        folder: 'inbox',
        maxResults: 20
      });

      expect(messages).toHaveLength(2);
      expect(messages[0]).toHaveProperty('id');
      expect(messages[0]).toHaveProperty('from');
      expect(messages[0]).toHaveProperty('subject');
    });

    it('should list unread messages only', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.messages.list.mockResolvedValue({
        data: { messages: [] }
      });

      await emailService.listMessages({
        folder: 'inbox',
        unreadOnly: true
      });

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.stringContaining('is:unread')
        })
      );
    });

    it('should throw error for SMTP provider', async () => {
      const smtpService = new EmailService({
        provider: 'smtp',
        smtpHost: 'smtp.example.com'
      });

      await expect(
        smtpService.listMessages()
      ).rejects.toThrow('List messages only supported for Gmail provider');
    });
  });

  describe('checkHealth', () => {
    it('should return operational when Gmail API is accessible', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.getProfile.mockResolvedValue({
        data: { emailAddress: 'test@example.com' }
      });

      const status = await emailService.checkHealth();

      expect(status).toBe('operational');
    });

    it('should return down when Gmail API fails', async () => {
      const { google } = await import('googleapis');
      const mockGmail = (google.gmail as any)();
      
      mockGmail.users.getProfile.mockRejectedValue(new Error('API Error'));

      const status = await emailService.checkHealth();

      expect(status).toBe('down');
    });

    it('should return degraded for SMTP provider', async () => {
      const smtpService = new EmailService({
        provider: 'smtp',
        smtpHost: 'smtp.example.com'
      });

      const status = await smtpService.checkHealth();

      expect(status).toBe('degraded');
    });
  });
});

