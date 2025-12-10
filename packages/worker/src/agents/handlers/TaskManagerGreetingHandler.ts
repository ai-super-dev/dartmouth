/**
 * Task Manager Greeting Handler
 * Provides personalized greetings with task context
 */

import type { Handler, Intent, Response, HandlerContext } from '../../types/shared';

export class TaskManagerGreetingHandler implements Handler {
  name = 'TaskManagerGreetingHandler';
  version = '1.0.0';
  priority = 100;

  canHandle(intent: Intent): boolean {
    return intent.type === 'greeting';
  }

  async handle(_message: string, _intent: Intent, context: HandlerContext): Promise<Response> {
    const greetings = [
      "Hi! I'm here to help you manage tasks and coordinate your team. What can I help you with?",
      "Hello! Ready to help you stay organized. What tasks are we working on today?",
      "Hey there! Let's tackle your tasks together. What do you need?",
      "Hi! I'm your Task Manager AI. How can I help you coordinate your work today?",
    ];

    let content = greetings[Math.floor(Math.random() * greetings.length)];

    // Add context if available
    const currentTask = context.state?.metadata?.currentTask;
    if (currentTask) {
      content += `\n\nI see you're working on ${currentTask}. Would you like an update on this task?`;
    }

    return {
      content,
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: 0,
        cached: false,
        confidence: 1.0,
      },
    };
  }
}

