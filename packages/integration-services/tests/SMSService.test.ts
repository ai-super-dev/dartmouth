import { describe, it, expect, beforeEach } from 'vitest';
import { SMSService } from '../src/SMSService';

describe('SMSService', () => {
  let smsService: SMSService;
  const mockConfig = {
    accountSid: 'test-account-sid',
    authToken: 'test-auth-token',
    fromNumber: '+1234567890'
  };

  beforeEach(() => {
    smsService = new SMSService(mockConfig);
  });

  describe('constructor', () => {
    it('should create SMSService instance', () => {
      expect(smsService).toBeInstanceOf(SMSService);
    });
  });

  describe('send', () => {
    it('should throw error if recipient is missing', async () => {
      await expect(
        smsService.send({
          to: '',
          body: 'Test message'
        })
      ).rejects.toThrow('Recipient (to) is required');
    });

    it('should throw error if body is missing', async () => {
      await expect(
        smsService.send({
          to: '+1234567890',
          body: ''
        })
      ).rejects.toThrow('Message body is required');
    });

    it('should throw not implemented error (stub)', async () => {
      await expect(
        smsService.send({
          to: '+1234567890',
          body: 'Test message'
        })
      ).rejects.toThrow('SMS service not yet implemented');
    });
  });

  describe('getStatus', () => {
    it('should throw not implemented error (stub)', async () => {
      await expect(
        smsService.getStatus('msg123')
      ).rejects.toThrow('SMS status check not yet implemented');
    });
  });

  describe('checkHealth', () => {
    it('should return down status (stub)', async () => {
      const status = await smsService.checkHealth();
      expect(status).toBe('down');
    });
  });
});

