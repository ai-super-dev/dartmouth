/**
 * Gratitude Handler
 * 
 * Handles thank you messages and expressions of gratitude from customers.
 * Responds warmly and professionally, reinforcing positive customer relationships.
 */

import type { Intent, Response } from '../types/shared';
import type { Handler, HandlerContext } from '../components/ResponseRouter';

export class GratitudeHandler implements Handler {
  name = 'GratitudeHandler';
  version = '1.0.0';
  priority = 20; // High priority - handle gratitude before general inquiries

  canHandle(intent: Intent): boolean {
    return intent.type === 'gratitude';
  }

  async handle(message: string, intent: Intent, context: HandlerContext): Promise<Response> {
    console.log('[GratitudeHandler] Handling gratitude message');

    // Generate a warm, professional thank you response
    const responses = [
      "You're very welcome! It's been our pleasure to help you. If you need anything else in the future, please don't hesitate to reach out!",
      "Thank you for your kind words! We're always happy to help. Feel free to contact us anytime you need assistance.",
      "We really appreciate your feedback! It's wonderful to hear that we could help. We're here whenever you need us!",
      "You're most welcome! We're glad we could assist you. Don't hesitate to get in touch if you need anything else.",
      "Thank you so much! We're thrilled we could help. Looking forward to working with you again!"
    ];

    // Select a response (could be random or based on context)
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      content: selectedResponse,
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        confidence: 0.95,
        sentiment: 'positive',
        requiresFollowUp: false
      }
    };
  }
}

