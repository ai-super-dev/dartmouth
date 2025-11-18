/**
 * Fallback Handler
 * 
 * Handles unknown intents and provides helpful fallback responses.
 */

import type { Intent, Response } from '../types/shared';
import type { Handler, HandlerContext } from '../components/ResponseRouter';

export class FallbackHandler implements Handler {
  name = 'FallbackHandler';
  version = '1.0.0';

  canHandle(_intent: Intent): boolean {
    // Fallback handler accepts all intents
    return true;
  }

  async handle(
    message: string,
    intent: Intent,
    _context: HandlerContext
  ): Promise<Response> {
    const startTime = Date.now();

    const responseText = this.getFallbackResponse(message, intent);

    return {
      content: responseText,
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: Date.now() - startTime,
        cached: false,
        confidence: 0.5
      },
      suggestions: [
        {
          type: 'rephrase',
          text: 'Try rephrasing your question',
          action: 'rephrase',
          priority: 'high'
        },
        {
          type: 'help',
          text: 'Ask for help',
          action: 'help',
          priority: 'medium'
        }
      ]
    };
  }

  private getFallbackResponse(_message: string, _intent: Intent): string {
    // Helpful, not robotic - shows willingness to help (Dartmouth personality)
    const responses = [
      "Hmm, I'm not quite sure what you're asking. Could you tell me a bit more about what you're trying to do? I'm here to help!",
      "I want to make sure I give you the right answer! Could you rephrase that or give me a bit more detail?",
      "I'm not following - but I really want to help! Can you explain what you need in a different way?",
      "Let me make sure I understand you correctly. Could you give me a bit more context about what you're looking for?"
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

