/**
 * Task Query Handler
 * Handles questions about tasks, status, and progress
 */

import type { Handler, Intent, Response, HandlerContext } from '../../types/shared';

export class TaskQueryHandler implements Handler {
  name = 'TaskQueryHandler';
  version = '1.0.0';
  priority = 85;

  canHandle(intent: Intent): boolean {
    return intent.type === 'task_query' || 
           (intent.type === 'information' && this.isTaskQuery(intent.originalMessage || ''));
  }

  private isTaskQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const keywords = [
      'show tasks', 'my tasks', 'what tasks', 'task status', 'task list',
      'overdue tasks', 'upcoming tasks', 'pending tasks', 'completed tasks',
      'who is working on', 'what is the status of'
    ];
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  async handle(_message: string, _intent: Intent, _context: HandlerContext): Promise<Response> {
    // Use LLM fallback for intelligent task queries with database context
    return {
      content: '', // Empty content triggers LLM fallback
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: 0,
        cached: false,
        confidence: 0.8,
        useLLMFallback: true, // Trigger LLM to query and format task data
      },
    };
  }
}

