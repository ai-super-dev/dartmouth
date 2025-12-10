/**
 * Task Manager AI Service V2
 * Uses TaskManagerAIAgent (extends BaseAgent with VectorRAG)
 * Replaces old TaskManagerAIService that used Workers AI directly
 */

import type { Env } from '../types/shared';
import { TaskManagerAIAgent } from '../agents/TaskManagerAIAgent';
import type { BaseAgentConfig } from '../BaseAgent';

interface TaskManagerContext {
  tenantId: string;
  staffId: string;
  staffName: string;
  conversationId?: string;
  contextType?: 'general' | 'task' | 'project';
  contextId?: string;
}

interface TaskManagerResponse {
  message: string;
  sessionId: string;
  metadata?: any;
}

export class TaskManagerAIServiceV2 {
  private env: Env;
  private agent: TaskManagerAIAgent | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get or create Task Manager AI Agent instance
   */
  private getAgent(tenantId: string, staffId: string): TaskManagerAIAgent {
    if (!this.agent) {
      const config: BaseAgentConfig = {
        agentId: 'mccarthy-task-manager',
        tenantId,
        userId: staffId,
        agentConfig: {
          agentId: 'mccarthy-task-manager',
          name: 'McCarthy Task Manager AI',
          description: 'Intelligent AI coordinator for task management',
          version: '2.0.0',
          systemPrompt: '', // TaskManagerAIAgent sets its own
          llmProvider: 'openai',
          llmModel: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500,
        },
        env: {
          DB: this.env.DB,
          APP_CONFIG: this.env.APP_CONFIG,
          CACHE: this.env.CACHE,
          FILES: this.env.FILES,
          WORKERS_AI: this.env.AI,
          VECTORIZE: this.env.VECTORIZE,
          OPENAI_API_KEY: this.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
          GOOGLE_API_KEY: this.env.GOOGLE_API_KEY,
        },
      };

      this.agent = new TaskManagerAIAgent(config);
      console.log('[TaskManagerAIServiceV2] Agent initialized');
    }

    return this.agent;
  }

  /**
   * Process a message from staff to Task Manager AI
   */
  async processMessage(
    context: TaskManagerContext,
    message: string
  ): Promise<TaskManagerResponse> {
    try {
      console.log(`[TaskManagerAIServiceV2] Processing message from ${context.staffName}`);

      // Get Task Manager AI Agent
      const agent = this.getAgent(context.tenantId, context.staffId);

      // Add task context if provided
      let enrichedMessage = message;
      if (context.contextType === 'task' && context.contextId) {
        enrichedMessage = `[Task: ${context.contextId}] ${message}`;
      }

      // Process message through agent
      const response = await agent.processMessage(enrichedMessage, context.conversationId);

      console.log(`[TaskManagerAIServiceV2] Response generated: ${response.content.substring(0, 100)}...`);

      return {
        message: response.content,
        sessionId: response.metadata?.sessionId || '',
        metadata: {
          ...response.metadata,
          conversationQualityScore: response.metadata?.conversationQualityScore,
          userSentiment: response.metadata?.userSentiment,
          processingTimeMs: response.metadata?.processingTimeMs,
        },
      };
    } catch (error: any) {
      console.error('[TaskManagerAIServiceV2] Error processing message:', error);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  /**
   * Get conversation history from agent
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    if (!this.agent) {
      return [];
    }

    const history = this.agent.getHistory();
    return history.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      intent: msg.intent,
    }));
  }

  /**
   * Get agent statistics
   */
  getStats(): any {
    if (!this.agent) {
      return null;
    }

    return this.agent.getStats();
  }

  /**
   * Search task knowledge base
   */
  async searchKnowledge(query: string): Promise<any> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    return await this.agent.searchTaskKnowledge(query);
  }

  /**
   * Ingest task documentation
   */
  async ingestDocumentation(title: string, content: string): Promise<void> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    await this.agent.ingestTaskDocumentation(title, content);
  }
}

