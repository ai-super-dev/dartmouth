/**
 * Task Manager RLHF Service
 * 
 * Reinforcement Learning from Human Feedback for Task Manager AI
 * 
 * Features:
 * - Staff review and edit AI responses
 * - Quality scoring (1-5 stars)
 * - Learning examples storage
 * - Continuous improvement
 * 
 * How it works:
 * 1. AI generates draft response
 * 2. Staff reviews and optionally edits
 * 3. Staff rates quality (1-5 stars)
 * 4. High-quality examples (4-5 stars) become learning examples
 * 5. AI learns from these examples for future responses
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface TaskManagerDraft {
  id: string;
  conversationId: string;
  staffId: string;
  userMessage: string;
  aiDraft: string;
  intent: string;
  contextData?: any;
  status: 'pending' | 'approved' | 'edited' | 'rejected';
  qualityScore?: number;
  finalResponse?: string;
  staffFeedback?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface LearningExample {
  id: string;
  intent: string;
  userMessage: string;
  aiResponse: string;
  qualityScore: number;
  contextType: string;
  metadata?: any;
}

export class TaskManagerRLHFService {
  constructor(private db: D1Database) {}

  /**
   * Create a draft response for staff review
   */
  async createDraft(
    conversationId: string,
    staffId: string,
    userMessage: string,
    aiDraft: string,
    intent: string,
    contextData?: any
  ): Promise<string> {
    const draftId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO task_manager_drafts (
        id, conversation_id, staff_id, user_message, ai_draft, intent,
        context_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      draftId,
      conversationId,
      staffId,
      userMessage,
      aiDraft,
      intent,
      contextData ? JSON.stringify(contextData) : null,
      'pending',
      now
    ).run();

    console.log(`[TaskManagerRLHF] Draft created: ${draftId}`);
    return draftId;
  }

  /**
   * Approve a draft without changes
   */
  async approveDraft(
    draftId: string,
    staffId: string,
    qualityScore: number
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update draft status
    await this.db.prepare(`
      UPDATE task_manager_drafts
      SET status = 'approved',
          quality_score = ?,
          final_response = ai_draft,
          reviewed_at = ?
      WHERE id = ? AND staff_id = ?
    `).bind(qualityScore, now, draftId, staffId).run();

    // If high quality (4-5 stars), add to learning examples
    if (qualityScore >= 4) {
      await this.addToLearningExamples(draftId);
    }

    console.log(`[TaskManagerRLHF] Draft approved: ${draftId}, score: ${qualityScore}`);
  }

  /**
   * Edit and approve a draft
   */
  async editAndApproveDraft(
    draftId: string,
    staffId: string,
    editedResponse: string,
    qualityScore: number,
    feedback?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update draft with edits
    await this.db.prepare(`
      UPDATE task_manager_drafts
      SET status = 'edited',
          quality_score = ?,
          final_response = ?,
          staff_feedback = ?,
          reviewed_at = ?
      WHERE id = ? AND staff_id = ?
    `).bind(
      qualityScore,
      editedResponse,
      feedback || null,
      now,
      draftId,
      staffId
    ).run();

    // If high quality (4-5 stars), add edited version to learning examples
    if (qualityScore >= 4) {
      await this.addToLearningExamples(draftId);
    }

    console.log(`[TaskManagerRLHF] Draft edited and approved: ${draftId}, score: ${qualityScore}`);
  }

  /**
   * Reject a draft
   */
  async rejectDraft(
    draftId: string,
    staffId: string,
    feedback: string
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db.prepare(`
      UPDATE task_manager_drafts
      SET status = 'rejected',
          quality_score = 1,
          staff_feedback = ?,
          reviewed_at = ?
      WHERE id = ? AND staff_id = ?
    `).bind(feedback, now, draftId, staffId).run();

    console.log(`[TaskManagerRLHF] Draft rejected: ${draftId}`);
  }

  /**
   * Add high-quality response to learning examples
   */
  private async addToLearningExamples(draftId: string): Promise<void> {
    // Get draft details
    const draft = await this.db.prepare(`
      SELECT 
        user_message,
        final_response,
        intent,
        quality_score,
        context_data
      FROM task_manager_drafts
      WHERE id = ?
    `).bind(draftId).first() as any;

    if (!draft || !draft.final_response) {
      console.warn(`[TaskManagerRLHF] Cannot add to learning examples: draft not found or no final response`);
      return;
    }

    const exampleId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO task_manager_learning_examples (
        id, intent, user_message, ai_response, quality_score,
        context_type, metadata, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      exampleId,
      draft.intent,
      draft.user_message,
      draft.final_response,
      draft.quality_score,
      'task_management',
      draft.context_data,
      1, // is_active
      now
    ).run();

    console.log(`[TaskManagerRLHF] Added to learning examples: ${exampleId}`);
  }

  /**
   * Get learning examples for a specific intent
   */
  async getLearningExamples(intent: string, limit: number = 5): Promise<LearningExample[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        id, intent, user_message, ai_response, quality_score,
        context_type, metadata
      FROM task_manager_learning_examples
      WHERE intent = ? AND is_active = 1 AND quality_score >= 4
      ORDER BY quality_score DESC, created_at DESC
      LIMIT ?
    `).bind(intent, limit).all();

    return results.map((row: any) => ({
      id: row.id,
      intent: row.intent,
      userMessage: row.user_message,
      aiResponse: row.ai_response,
      qualityScore: row.quality_score,
      contextType: row.context_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  /**
   * Get all high-quality learning examples (for few-shot prompting)
   */
  async getAllLearningExamples(limit: number = 10): Promise<LearningExample[]> {
    const { results } = await this.db.prepare(`
      SELECT 
        id, intent, user_message, ai_response, quality_score,
        context_type, metadata
      FROM task_manager_learning_examples
      WHERE is_active = 1 AND quality_score >= 4
      ORDER BY quality_score DESC, created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return results.map((row: any) => ({
      id: row.id,
      intent: row.intent,
      userMessage: row.user_message,
      aiResponse: row.ai_response,
      qualityScore: row.quality_score,
      contextType: row.context_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  /**
   * Get pending drafts for a staff member
   */
  async getPendingDrafts(staffId: string): Promise<TaskManagerDraft[]> {
    const { results } = await this.db.prepare(`
      SELECT *
      FROM task_manager_drafts
      WHERE staff_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).bind(staffId).all();

    return results.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      staffId: row.staff_id,
      userMessage: row.user_message,
      aiDraft: row.ai_draft,
      intent: row.intent,
      contextData: row.context_data ? JSON.parse(row.context_data) : null,
      status: row.status,
      qualityScore: row.quality_score,
      finalResponse: row.final_response,
      staffFeedback: row.staff_feedback,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    }));
  }

  /**
   * Get RLHF statistics
   */
  async getStats(): Promise<any> {
    const stats = await this.db.prepare(`
      SELECT
        COUNT(*) as total_drafts,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'edited' THEN 1 ELSE 0 END) as edited,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN quality_score IS NOT NULL THEN quality_score ELSE NULL END) as avg_quality_score
      FROM task_manager_drafts
    `).first();

    const learningExamples = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM task_manager_learning_examples
      WHERE is_active = 1
    `).first();

    return {
      drafts: stats,
      learningExamples: learningExamples?.count || 0,
    };
  }
}

