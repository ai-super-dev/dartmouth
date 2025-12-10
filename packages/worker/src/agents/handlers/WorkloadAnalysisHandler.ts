/**
 * Workload Analysis Handler
 * Analyzes team workload and provides insights
 */

import type { Handler, Intent, Response, HandlerContext } from '../../types/shared';

export class WorkloadAnalysisHandler implements Handler {
  name = 'WorkloadAnalysisHandler';
  version = '1.0.0';
  priority = 80;

  canHandle(intent: Intent): boolean {
    return intent.type === 'workload_analysis' || 
           (intent.type === 'information' && this.isWorkloadQuery(intent.originalMessage || ''));
  }

  private isWorkloadQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const keywords = [
      'workload', 'who is busy', 'who is available', 'team capacity',
      'who has time', 'who can take', 'distribute tasks', 'balance workload'
    ];
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  async handle(_message: string, _intent: Intent, _context: HandlerContext): Promise<Response> {
    // Use LLM fallback for intelligent workload analysis
    return {
      content: '', // Empty content triggers LLM fallback
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: 0,
        cached: false,
        confidence: 0.8,
        useLLMFallback: true, // Trigger LLM to analyze workload data
      },
    };
  }
}

