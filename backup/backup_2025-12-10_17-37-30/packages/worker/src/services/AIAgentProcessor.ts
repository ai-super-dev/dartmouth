/**
 * AI Agent Processor
 * 
 * Processes tickets with the Customer Service AI Agent and generates draft responses.
 * Handles auto-escalation logic based on confidence scores and ticket attributes.
 */

import { CustomerServiceAgent } from '../../../customer-service-agent/src/CustomerServiceAgent';
import type { Env } from '../types/shared';

export interface AIAgentConfig {
  enabled: boolean;
  mode: 'auto' | 'draft'; // auto = send immediately, draft = require approval
  minConfidenceForAuto: number; // 0.0 - 1.0
  autoEscalateOnLowConfidence: boolean;
  autoEscalateThreshold: number;
  escalateAngry: boolean;
  escalateVIP: boolean;
}

export interface AIProcessingResult {
  success: boolean;
  draftContent?: string;
  confidenceScore?: number;
  intent?: string;
  handler?: string;
  reasoning?: string;
  suggestedActions?: string[];
  shouldEscalate: boolean;
  escalationReason?: string;
  metadata?: {
    shopifyData?: any;
    perpData?: any;
    processingTimeMs?: number;
  };
  error?: string;
}

export class AIAgentProcessor {
  private agent: CustomerServiceAgent;
  private config: AIAgentConfig;

  constructor(env: Env, config?: Partial<AIAgentConfig>) {
    // Initialize Customer Service Agent with optional integrations
    try {
      this.agent = new CustomerServiceAgent({
        env,
        agentId: 'ai-agent-001', // Top-level agentId for BaseAgent
        tenantId: 'test-tenant-dtf', // Top-level tenantId for BaseAgent
        agentConfig: {
          agentId: 'ai-agent-001',
          systemPrompt: '', // Will be overridden by CustomerServiceAgent
          temperature: 0.7,
          maxTokens: 2000,
          llmProvider: 'openai', // Use OpenAI GPT-4
          llmModel: 'gpt-4o', // GPT-4 Optimized model
        },
        aiResponseMode: 'draft', // Always use draft mode in this processor
        // Shopify/PERP/Gmail integrations are optional - will be undefined if not configured
      });
      console.log('[AIAgentProcessor] Customer Service Agent initialized with OpenAI GPT-4o');
    } catch (error) {
      console.warn('[AIAgentProcessor] Failed to initialize Customer Service Agent:', error);
      // Agent will be undefined, we'll handle this in processTicket
      this.agent = null as any;
    }

    // Default configuration
    this.config = {
      enabled: true,
      mode: 'draft', // Default to draft mode for safety
      minConfidenceForAuto: 0.85,
      autoEscalateOnLowConfidence: true,
      autoEscalateThreshold: 0.60,
      escalateAngry: true,
      escalateVIP: true,
      ...config,
    };
  }

  /**
   * Process a ticket with the AI agent
   */
  async processTicket(
    ticketId: string,
    ticketNumber: string,
    customerEmail: string,
    customerName: string,
    subject: string,
    description: string,
    priority: string,
    sentiment: string,
    category: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();

    console.log(`[RLHF] 🤖 AI Processing started for ticket ${ticketNumber}`, {
      ticketId,
      customerEmail,
      priority,
      sentiment,
      category,
      messageLength: description.length,
      hasHistory: conversationHistory.length > 0
    });

    try {
      // Check if AI is enabled
      if (!this.config.enabled) {
        console.log('[RLHF] ⚠️ AI Agent is disabled');
        return {
          success: false,
          shouldEscalate: false,
          error: 'AI Agent is disabled',
        };
      }

      // Check if agent is available - if not, use fallback
      if (!this.agent) {
        console.log('[RLHF] 🔄 Using fallback draft generation (integrations not configured)');
        return this.generateFallbackDraft(
          customerName,
          subject,
          description,
          sentiment,
          priority
        );
      }

      // Check for immediate escalation conditions
      const immediateEscalation = this.checkImmediateEscalation(
        sentiment,
        priority,
        customerEmail
      );

      if (immediateEscalation.shouldEscalate) {
        console.log(`[RLHF] 🚨 Immediate escalation triggered: ${immediateEscalation.reason}`);
        return {
          success: true,
          shouldEscalate: true,
          escalationReason: immediateEscalation.reason,
          metadata: {
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(
        customerName,
        customerEmail,
        subject,
        description,
        conversationHistory
      );

      console.log('[RLHF] 🧠 Calling Customer Service Agent...');

      // Generate AI response
      const response = await this.agent.processMessage(
        description,
        ticketId,
        {
          customerEmail,
          customerName,
          subject,
          priority,
          sentiment,
          category,
          conversationHistory,
        }
      );

      // Extract metadata from response
      const metadata = response.metadata || {};
      const confidenceScore = metadata.confidence || 0.8; // Default to 0.8 for LLM responses
      const intent = metadata.intentType || metadata.intent || 'general_inquiry'; // Use detected intent
      const handler = metadata.handlerName || metadata.handler || 'LLMHandler';

      console.log(`[RLHF] 📊 AI Response generated:`, {
        intent,
        handler,
        confidence: `${Math.round(confidenceScore * 100)}%`,
        responseLength: response.content.length,
        processingTimeMs: Date.now() - startTime,
        usedLLM: !!metadata.usedLLM
      });

      // Determine if escalation is needed
      // NOTE: If LLM generated a response, trust it unless confidence is very low
      const escalationCheck = this.shouldEscalate(
        confidenceScore,
        sentiment,
        priority,
        customerEmail,
        intent
      );

      if (escalationCheck.shouldEscalate) {
        console.log(`[RLHF] ⚠️ Escalation recommended: ${escalationCheck.reason}`);
      } else {
        console.log(`[RLHF] ✅ High confidence response - ready for approval`);
      }

      // Build reasoning
      const reasoning = this.buildReasoning(
        confidenceScore,
        intent,
        handler,
        metadata
      );

      // Build suggested actions
      const suggestedActions = this.buildSuggestedActions(
        intent,
        confidenceScore,
        escalationCheck.shouldEscalate
      );

      console.log(`[RLHF] 🎯 Draft ready for staff review (${Date.now() - startTime}ms)`);

      return {
        success: true,
        draftContent: response.content,
        confidenceScore,
        intent,
        handler,
        reasoning,
        suggestedActions,
        shouldEscalate: escalationCheck.shouldEscalate,
        escalationReason: escalationCheck.reason,
        metadata: {
          shopifyData: metadata.shopifyData,
          perpData: metadata.perpData,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('[RLHF] ❌ Error processing ticket:', error);
      return {
        success: false,
        shouldEscalate: true,
        escalationReason: 'AI processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Check for immediate escalation conditions (before AI processing)
   */
  private checkImmediateEscalation(
    sentiment: string,
    priority: string,
    customerEmail: string
  ): { shouldEscalate: boolean; reason?: string } {
    // Escalate angry customers immediately
    if (this.config.escalateAngry && sentiment === 'angry') {
      return {
        shouldEscalate: true,
        reason: 'Angry customer - requires human attention',
      };
    }

    // Escalate critical/urgent priority immediately
    if (priority === 'critical' || priority === 'urgent') {
      return {
        shouldEscalate: true,
        reason: `${priority.charAt(0).toUpperCase() + priority.slice(1)} priority - requires immediate human attention`,
      };
    }

    // Check if VIP customer (placeholder - would check database)
    if (this.config.escalateVIP && this.isVIPCustomer(customerEmail)) {
      return {
        shouldEscalate: true,
        reason: 'VIP customer - requires human attention',
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Determine if ticket should be escalated based on AI processing results
   */
  private shouldEscalate(
    confidenceScore: number,
    sentiment: string,
    priority: string,
    customerEmail: string,
    intent: string
  ): { shouldEscalate: boolean; reason?: string } {
    // Low confidence - escalate
    if (
      this.config.autoEscalateOnLowConfidence &&
      confidenceScore < this.config.autoEscalateThreshold
    ) {
      return {
        shouldEscalate: true,
        reason: `Low confidence (${Math.round(confidenceScore * 100)}%) - requires human review`,
      };
    }

    // Unknown intent with low confidence - escalate
    // NOTE: Don't escalate if confidence is decent, even with unknown intent
    // The LLM may have generated a good response without specific intent classification
    if ((intent === 'unknown' || intent === 'fallback') && confidenceScore < 0.7) {
      return {
        shouldEscalate: true,
        reason: 'Unable to determine customer intent with low confidence - requires human review',
      };
    }

    // Negative sentiment with medium confidence - escalate
    if (sentiment === 'negative' && confidenceScore < 0.75) {
      return {
        shouldEscalate: true,
        reason: 'Negative sentiment with medium confidence - requires human review',
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Build conversation context for AI agent
   */
  private buildConversationContext(
    customerName: string,
    customerEmail: string,
    subject: string,
    description: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): string {
    let context = `Customer: ${customerName} (${customerEmail})\n`;
    context += `Subject: ${subject}\n\n`;

    if (conversationHistory.length > 0) {
      context += 'Previous conversation:\n';
      conversationHistory.forEach((msg) => {
        context += `${msg.role}: ${msg.content}\n`;
      });
      context += '\n';
    }

    context += `Current message: ${description}`;

    return context;
  }

  /**
   * Build reasoning explanation for staff
   */
  private buildReasoning(
    confidenceScore: number,
    intent: string,
    handler: string,
    metadata: any
  ): string {
    const confidence = Math.round(confidenceScore * 100);
    let reasoning = `Confidence: ${confidence}% - `;

    if (confidence >= 85) {
      reasoning += 'High confidence. ';
    } else if (confidence >= 70) {
      reasoning += 'Medium confidence. ';
    } else {
      reasoning += 'Low confidence. ';
    }

    reasoning += `Detected intent: ${intent}. `;
    reasoning += `Handler used: ${handler}. `;

    if (metadata.shopifyData) {
      reasoning += 'Retrieved Shopify order data. ';
    }

    if (metadata.perpData) {
      reasoning += 'Retrieved production data from PERP. ';
    }

    return reasoning;
  }

  /**
   * Build suggested actions for staff
   */
  private buildSuggestedActions(
    intent: string,
    confidenceScore: number,
    shouldEscalate: boolean
  ): string[] {
    const actions: string[] = [];

    if (shouldEscalate) {
      actions.push('Review and edit response before sending');
      actions.push('Consider calling customer for complex issues');
    } else if (confidenceScore >= 0.85) {
      actions.push('Send immediately');
      actions.push('Response is ready to go');
    } else {
      actions.push('Review response for accuracy');
      actions.push('Add personal touch if needed');
    }

    // Intent-specific actions
    if (intent === 'order_status') {
      actions.push('Verify order status in Shopify');
    } else if (intent === 'production_status') {
      actions.push('Check PERP for latest production updates');
    } else if (intent === 'invoice_request') {
      actions.push('Ensure invoice is attached or linked');
    }

    return actions;
  }

  /**
   * Check if customer is VIP (placeholder)
   */
  private isVIPCustomer(email: string): boolean {
    // TODO: Implement VIP customer check from database
    // For now, return false
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIAgentConfig {
    return { ...this.config };
  }

  /**
   * Generate a fallback draft response when integrations aren't configured
   */
  private generateFallbackDraft(
    customerName: string,
    subject: string,
    description: string,
    sentiment: string,
    priority: string
  ): AIProcessingResult {
    // Generate a simple, professional response
    let draftContent = `Hi ${customerName},\n\n`;
    draftContent += `Thank you for contacting us regarding "${subject}".\n\n`;
    
    // Add sentiment-appropriate response
    if (sentiment === 'angry' || sentiment === 'negative') {
      draftContent += `I sincerely apologize for any inconvenience you've experienced. `;
    } else if (sentiment === 'positive') {
      draftContent += `We're glad to hear from you! `;
    }
    
    draftContent += `I've received your inquiry and our team is looking into this for you.\n\n`;
    draftContent += `We'll get back to you shortly with more information.\n\n`;
    draftContent += `Best regards,\n`;
    draftContent += `Customer Service Team`;

    return {
      success: true,
      draftContent,
      confidenceScore: 0.65, // Medium confidence for fallback
      intent: 'general_inquiry',
      handler: 'FallbackHandler',
      reasoning: 'Generated basic response (integrations not configured). Manual review recommended.',
      suggestedActions: [
        'Review and personalize response',
        'Add specific details about their inquiry',
        'Configure Shopify/PERP integrations for better responses'
      ],
      shouldEscalate: true, // Always escalate fallback responses
      escalationReason: 'Using fallback response - integrations not configured',
      metadata: {
        processingTimeMs: 0
      }
    };
  }
}

