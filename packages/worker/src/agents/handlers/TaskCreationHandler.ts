/**
 * Task Creation Handler
 * Handles natural language task creation requests
 */

import type { Handler, Intent, Response, HandlerContext } from '../../types/shared';

export class TaskCreationHandler implements Handler {
  name = 'TaskCreationHandler';
  version = '1.0.0';
  priority = 90;

  canHandle(intent: Intent): boolean {
    return intent.type === 'task_creation' || 
           (intent.type === 'unknown' && this.isTaskCreationRequest(intent.originalMessage || ''));
  }

  private isTaskCreationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const keywords = ['create task', 'new task', 'add task', 'make a task', 'create a task for'];
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  async handle(message: string, _intent: Intent, _context: HandlerContext): Promise<Response> {
    // Extract task details from message
    const taskDetails = this.extractTaskDetails(message);

    // Use LLM fallback for intelligent task creation
    return {
      content: '', // Empty content triggers LLM fallback
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: 0,
        cached: false,
        confidence: 0.8,
        useLLMFallback: true, // Trigger LLM to create structured task
        taskDetails,
      },
    };
  }

  private extractTaskDetails(message: string): any {
    const details: any = {};

    // Extract priority
    if (message.toLowerCase().includes('urgent') || message.toLowerCase().includes('asap')) {
      details.priority = 'urgent';
    } else if (message.toLowerCase().includes('high priority')) {
      details.priority = 'high';
    }

    // Extract deadline keywords
    if (message.toLowerCase().includes('today')) {
      details.deadline = 'today';
    } else if (message.toLowerCase().includes('tomorrow')) {
      details.deadline = 'tomorrow';
    } else if (message.toLowerCase().includes('this week')) {
      details.deadline = 'this_week';
    }

    // Extract assignee mentions
    const assigneeMatch = message.match(/assign(?:ed)? to (\w+)/i);
    if (assigneeMatch) {
      details.assignee = assigneeMatch[1];
    }

    return details;
  }
}

