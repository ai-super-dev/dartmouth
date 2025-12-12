import { describe, it, expect, beforeEach } from 'vitest';
import { InterruptHandler } from '../src/InterruptHandler';

describe('InterruptHandler', () => {
  let interruptHandler: InterruptHandler;

  beforeEach(() => {
    interruptHandler = new InterruptHandler();
  });

  describe('handle', () => {
    it('should interrupt a session', async () => {
      const result = await interruptHandler.handle({
        sessionId: 'test-session-1',
        action: 'interrupt'
      });

      expect(result.status).toBe('interrupted');
      expect(result.sessionId).toBe('test-session-1');
    });

    it('should resume an interrupted session', async () => {
      // First interrupt
      await interruptHandler.handle({
        sessionId: 'test-session-2',
        action: 'interrupt'
      });

      // Then resume
      const result = await interruptHandler.handle({
        sessionId: 'test-session-2',
        action: 'resume'
      });

      expect(result.status).toBe('resumed');
    });

    it('should cancel a session', async () => {
      const result = await interruptHandler.handle({
        sessionId: 'test-session-3',
        action: 'cancel'
      });

      expect(result.status).toBe('cancelled');
    });

    it('should throw error for missing sessionId', async () => {
      await expect(
        interruptHandler.handle({
          sessionId: '',
          action: 'interrupt'
        } as any)
      ).rejects.toThrow();
    });

    it('should throw error for unknown action', async () => {
      await expect(
        interruptHandler.handle({
          sessionId: 'test-session',
          action: 'unknown' as any
        })
      ).rejects.toThrow('Unknown interrupt action');
    });

    it('should throw error when resuming non-existent session', async () => {
      await expect(
        interruptHandler.handle({
          sessionId: 'non-existent',
          action: 'resume'
        })
      ).rejects.toThrow('Session not found');
    });
  });
});

