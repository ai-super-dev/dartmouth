/**
 * Knowledge Service
 * 
 * Provides AI agents with knowledge from:
 * 1. System Message Configuration (role, personality, do's/don'ts)
 * 2. RAG Documents (policies, FAQs, product info)
 * 3. Learning Examples (high-quality past responses)
 * 
 * This is the bridge between stored knowledge and AI prompts.
 */

import type { D1Database } from '../types/shared';

export interface SystemMessageConfig {
  role: string;
  personality: string;
  responsibilities: string;
  dos: string;
  donts: string;
  tone: string;
  custom_instructions: string;
}

export interface LearningExample {
  id: string;
  intent: string;
  customer_message: string;
  ai_response: string;
  quality_score: number;
  sentiment?: string;
}

export interface RAGDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  relevance_score?: number;
}

export interface KnowledgeContext {
  systemMessage: string;
  learningExamples: LearningExample[];
  ragContext: string;
  ragDocuments: RAGDocument[];
}

const DEFAULT_SYSTEM_MESSAGE: SystemMessageConfig = {
  role: `You are McCarthy AI, a friendly and professional customer service assistant for Amazing Transfers, an Australian company specializing in DTF (Direct to Film) and UV DTF transfers for custom printing.`,
  personality: `- Warm, helpful, and professional
- Use Australian English (colour, metre, etc.)
- Friendly but not overly casual
- Patient and understanding
- Knowledgeable about DTF printing`,
  responsibilities: `- Answer questions about products, ordering, and policies
- Help customers with order inquiries
- Provide application instructions for DTF and UV DTF transfers
- Explain shipping, returns, and refund policies
- Assist with artwork requirements and file formats
- Escalate complex issues to human staff when needed`,
  dos: `- Always be polite and respectful
- Provide accurate information from the knowledge base
- Acknowledge customer frustrations with empathy
- Offer to escalate to human staff when you can't help
- Use the customer's name when known
- Confirm understanding before providing solutions`,
  donts: `- Never make up information or guess at policies
- Don't provide specific pricing (direct to website)
- Don't promise things you can't guarantee
- Never argue with customers
- Don't share internal business information
- Don't use American spelling (use colour not color)`,
  tone: `Professional yet friendly. Think of a knowledgeable colleague who genuinely wants to help. Not robotic, but not overly casual either. Match the customer's energy level.`,
  custom_instructions: ``,
};

export class KnowledgeService {
  private db: D1Database;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Get the full system message configuration
   */
  async getSystemMessageConfig(): Promise<SystemMessageConfig> {
    // Check cache
    const cached = this.cache.get('system_message');
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[KnowledgeService] Using cached system message config');
      return cached.data;
    }

    try {
      const result = await this.db.prepare(`
        SELECT * FROM ai_system_message_config WHERE id = 'default'
      `).first();

      if (result) {
        const config: SystemMessageConfig = {
          role: (result.role as string) || DEFAULT_SYSTEM_MESSAGE.role,
          personality: (result.personality as string) || DEFAULT_SYSTEM_MESSAGE.personality,
          responsibilities: (result.responsibilities as string) || DEFAULT_SYSTEM_MESSAGE.responsibilities,
          dos: (result.dos as string) || DEFAULT_SYSTEM_MESSAGE.dos,
          donts: (result.donts as string) || DEFAULT_SYSTEM_MESSAGE.donts,
          tone: (result.tone as string) || DEFAULT_SYSTEM_MESSAGE.tone,
          custom_instructions: (result.custom_instructions as string) || '',
        };
        
        this.cache.set('system_message', { data: config, timestamp: Date.now() });
        console.log('[KnowledgeService] Loaded system message config from DB');
        return config;
      }
    } catch (error) {
      console.error('[KnowledgeService] Error loading system message config:', error);
    }

    console.log('[KnowledgeService] Using default system message config');
    return DEFAULT_SYSTEM_MESSAGE;
  }

  /**
   * Build the full system prompt from configuration
   */
  async buildSystemPrompt(): Promise<string> {
    const config = await this.getSystemMessageConfig();

    let prompt = `# Role
${config.role}

# Personality
${config.personality}

# Responsibilities
${config.responsibilities}

# Do's ✅
${config.dos}

# Don'ts ❌
${config.donts}

# Tone
${config.tone}`;

    if (config.custom_instructions) {
      prompt += `

# Custom Instructions
${config.custom_instructions}`;
    }

    return prompt;
  }

  /**
   * Get top learning examples for few-shot prompting
   */
  async getLearningExamples(limit: number = 5): Promise<LearningExample[]> {
    try {
      const { results } = await this.db.prepare(`
        SELECT 
          id,
          intent,
          customer_message,
          ai_response,
          quality_score,
          sentiment
        FROM ai_learning_examples
        WHERE is_active = 1 AND quality_score >= 4
        ORDER BY quality_score DESC, created_at DESC
        LIMIT ?
      `).bind(limit).all();

      console.log(`[KnowledgeService] Loaded ${results?.length || 0} learning examples`);
      return (results || []) as LearningExample[];
    } catch (error) {
      console.error('[KnowledgeService] Error loading learning examples:', error);
      return [];
    }
  }

  /**
   * Format learning examples for injection into prompt
   */
  formatLearningExamples(examples: LearningExample[]): string {
    if (examples.length === 0) return '';

    let formatted = `\n# High-Quality Response Examples
Learn from these excellent responses that your team has approved:\n`;

    examples.forEach((ex, i) => {
      formatted += `
## Example ${i + 1} (Quality: ${ex.quality_score}/5, Intent: ${ex.intent})
**Customer:** ${ex.customer_message.substring(0, 200)}${ex.customer_message.length > 200 ? '...' : ''}
**Response:** ${ex.ai_response.substring(0, 500)}${ex.ai_response.length > 500 ? '...' : ''}
`;
    });

    return formatted;
  }

  /**
   * Search RAG documents for relevant content
   * Uses simple keyword matching (can be upgraded to vector search later)
   */
  async searchRAGDocuments(query: string, limit: number = 3): Promise<RAGDocument[]> {
    try {
      // Extract keywords from query (simple approach)
      const keywords = query.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 10);

      if (keywords.length === 0) {
        console.log('[KnowledgeService] No keywords extracted from query');
        return [];
      }

      console.log(`[KnowledgeService] Searching RAG docs with keywords: ${keywords.join(', ')}`);

      // Build LIKE clauses for each keyword
      const likeClauses = keywords.map(() => `(content LIKE ? OR title LIKE ?)`).join(' OR ');
      const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

      const { results } = await this.db.prepare(`
        SELECT id, title, category, content
        FROM ai_knowledge_documents
        WHERE status = 'active' 
          AND deleted_at IS NULL
          AND (${likeClauses})
        LIMIT ?
      `).bind(...params, limit).all();

      console.log(`[KnowledgeService] Found ${results?.length || 0} relevant RAG documents`);
      return (results || []) as RAGDocument[];
    } catch (error) {
      console.error('[KnowledgeService] Error searching RAG documents:', error);
      return [];
    }
  }

  /**
   * Format RAG documents for injection into prompt
   */
  formatRAGContext(documents: RAGDocument[]): string {
    if (documents.length === 0) return '';

    let formatted = `\n# Knowledge Base Context
Use this information to answer the customer's question accurately:\n`;

    documents.forEach((doc) => {
      // Truncate content to avoid token limits
      const truncatedContent = doc.content.length > 2000 
        ? doc.content.substring(0, 2000) + '...[truncated]'
        : doc.content;

      formatted += `
## ${doc.title} (${doc.category})
${truncatedContent}
---
`;
    });

    return formatted;
  }

  /**
   * Get full knowledge context for a customer query
   * This is the main method to call when generating AI responses
   */
  async getKnowledgeContext(customerMessage: string): Promise<KnowledgeContext> {
    console.log('[KnowledgeService] Building knowledge context...');
    const startTime = Date.now();

    // Fetch all knowledge sources in parallel
    const [systemPrompt, learningExamples, ragDocuments] = await Promise.all([
      this.buildSystemPrompt(),
      this.getLearningExamples(5),
      this.searchRAGDocuments(customerMessage, 3)
    ]);

    const ragContext = this.formatRAGContext(ragDocuments);
    const examplesFormatted = this.formatLearningExamples(learningExamples);

    console.log(`[KnowledgeService] Knowledge context built in ${Date.now() - startTime}ms`);
    console.log(`[KnowledgeService] - System prompt: ${systemPrompt.length} chars`);
    console.log(`[KnowledgeService] - Learning examples: ${learningExamples.length}`);
    console.log(`[KnowledgeService] - RAG documents: ${ragDocuments.length}`);

    return {
      systemMessage: systemPrompt + examplesFormatted + ragContext,
      learningExamples,
      ragContext,
      ragDocuments
    };
  }

  /**
   * Clear the cache (useful after config updates)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[KnowledgeService] Cache cleared');
  }
}

