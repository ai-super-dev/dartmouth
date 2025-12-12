import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingService } from '../src/StreamingService';

describe('StreamingService', () => {
  let streamingService: StreamingService;

  beforeEach(() => {
    streamingService = new StreamingService();
  });

  describe('manage', () => {
    it('should start a stream', async () => {
      const result = await streamingService.manage({
        sessionId: 'test-session-1',
        action: 'start'
      });

      expect(result.status).toBe('active');
      expect(result.sessionId).toBe('test-session-1');
      expect(result.streamId).toBeDefined();
    });

    it('should stop a stream', async () => {
      // First start a stream
      await streamingService.manage({
        sessionId: 'test-session-2',
        action: 'start'
      });

      // Then stop it
      const result = await streamingService.manage({
        sessionId: 'test-session-2',
        action: 'stop'
      });

      expect(result.status).toBe('stopped');
    });

    it('should pause a stream', async () => {
      // First start a stream
      await streamingService.manage({
        sessionId: 'test-session-3',
        action: 'start'
      });

      // Then pause it
      const result = await streamingService.manage({
        sessionId: 'test-session-3',
        action: 'pause'
      });

      expect(result.status).toBe('paused');
    });

    it('should resume a paused stream', async () => {
      // Start and pause
      await streamingService.manage({
        sessionId: 'test-session-4',
        action: 'start'
      });
      await streamingService.manage({
        sessionId: 'test-session-4',
        action: 'pause'
      });

      // Then resume
      const result = await streamingService.manage({
        sessionId: 'test-session-4',
        action: 'resume'
      });

      expect(result.status).toBe('active');
    });

    it('should throw error for missing sessionId', async () => {
      await expect(
        streamingService.manage({
          sessionId: '',
          action: 'start'
        } as any)
      ).rejects.toThrow();
    });

    it('should throw error for unknown action', async () => {
      await expect(
        streamingService.manage({
          sessionId: 'test-session',
          action: 'unknown' as any
        })
      ).rejects.toThrow('Unknown stream action');
    });

    it('should throw error when stopping non-existent stream', async () => {
      await expect(
        streamingService.manage({
          sessionId: 'non-existent',
          action: 'stop'
        })
      ).rejects.toThrow('Stream not found');
    });
  });

  describe('checkHealth', () => {
    it('should return operational status', async () => {
      const status = await streamingService.checkHealth();
      
      expect(['operational', 'degraded', 'down']).toContain(status);
    });
  });
});

