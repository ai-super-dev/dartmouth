/**
 * InterruptHandler - Interrupt Handling Service
 * 
 * Handles interrupts for voice operations (stop, resume, cancel).
 * 
 * @example
 * ```typescript
 * const interruptHandler = new InterruptHandler();
 * const result = await interruptHandler.handle({
 *   sessionId: 'session-123',
 *   action: 'interrupt'
 * });
 * ```
 */

import type { InterruptOptions, InterruptResult } from './types';
import { VoiceServiceError } from './types';

export class InterruptHandler {
  private activeSessions: Map<string, { status: string; previousState?: string }>;

  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Handle interrupt
   * @param options - Interrupt options
   * @returns Interrupt result
   */
  async handle(options: InterruptOptions): Promise<InterruptResult> {
    const { sessionId, action } = options;

    if (!sessionId) {
      throw new VoiceServiceError(
        'Session ID is required',
        'INVALID_SESSION_ID',
        400
      );
    }

    try {
      switch (action) {
        case 'interrupt':
          return await this.interruptSession(sessionId);
        case 'resume':
          return await this.resumeSession(sessionId);
        case 'cancel':
          return await this.cancelSession(sessionId);
        default:
          throw new VoiceServiceError(
            `Unknown interrupt action: ${action}`,
            'UNKNOWN_ACTION',
            400
          );
      }
    } catch (error) {
      if (error instanceof VoiceServiceError) {
        throw error;
      }
      throw new VoiceServiceError(
        `Failed to handle interrupt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INTERRUPT_FAILED',
        500
      );
    }
  }

  /**
   * Interrupt a session
   */
  private async interruptSession(sessionId: string): Promise<InterruptResult> {
    const existing = this.activeSessions.get(sessionId);
    const previousState = existing?.status || 'active';

    this.activeSessions.set(sessionId, {
      status: 'interrupted',
      previousState
    });

    return {
      status: 'interrupted',
      sessionId,
      timestamp: new Date().toISOString(),
      previousState
    };
  }

  /**
   * Resume an interrupted session
   */
  private async resumeSession(sessionId: string): Promise<InterruptResult> {
    const existing = this.activeSessions.get(sessionId);
    
    if (!existing) {
      throw new VoiceServiceError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        404
      );
    }

    if (existing.status !== 'interrupted') {
      throw new VoiceServiceError(
        `Session is not interrupted: ${existing.status}`,
        'INVALID_SESSION_STATE',
        400
      );
    }

    const previousState = existing.previousState || 'active';

    this.activeSessions.set(sessionId, {
      status: previousState,
      previousState: 'interrupted'
    });

    return {
      status: 'resumed',
      sessionId,
      timestamp: new Date().toISOString(),
      previousState: 'interrupted'
    };
  }

  /**
   * Cancel a session
   */
  private async cancelSession(sessionId: string): Promise<InterruptResult> {
    const existing = this.activeSessions.get(sessionId);
    const previousState = existing?.status || 'active';

    this.activeSessions.delete(sessionId);

    return {
      status: 'cancelled',
      sessionId,
      timestamp: new Date().toISOString(),
      previousState
    };
  }
}

