/**
 * McCarthy Task Manager AI Agent
 * 
 * Intelligent AI coordinator for task management, workload balancing, and team coordination.
 * Extends the Dartmouth Foundation (BaseAgent) with task-specific capabilities.
 * 
 * Features:
 * - Natural language task creation and updates
 * - Proactive task monitoring and reminders
 * - Smart workload balancing
 * - Cross-department coordination
 * - RLHF learning from staff feedback
 * - VectorRAG knowledge base for task patterns
 * 
 * @extends BaseAgent - Inherits conversation quality, memory, constraints, routing, VectorRAG
 */

import type { AgentConfig, Response } from '../types/shared';
import { BaseAgent, BaseAgentConfig } from '../BaseAgent';
import { TaskManagerGreetingHandler } from './handlers/TaskManagerGreetingHandler';
import { TaskCreationHandler } from './handlers/TaskCreationHandler';
import { TaskQueryHandler } from './handlers/TaskQueryHandler';
import { WorkloadAnalysisHandler } from './handlers/WorkloadAnalysisHandler';

/**
 * McCarthy Task Manager AI Agent
 */
export class TaskManagerAIAgent extends BaseAgent {
  // Agent Metadata
  public readonly type = 'task_manager_ai';
  public readonly name = 'McCarthy Task Manager AI';
  public readonly version = '2.0.0'; // v2.0 with VectorRAG
  public readonly description = 'Intelligent AI coordinator for task management and team coordination';

  constructor(config: BaseAgentConfig) {
    super(config);
    
    // Register Task Manager specific handlers
    this.registerTaskManagerHandlers();
    
    // Register Task Manager constraints
    this.registerTaskManagerConstraints();
    
    console.log('[TaskManagerAIAgent] ✅ Initialized with VectorRAG support');
  }

  /**
   * Register Task Manager specific handlers
   */
  private registerTaskManagerHandlers(): void {
    const router = this.getResponseRouter();
    
    // Register specialized handlers
    router.registerHandler(new TaskManagerGreetingHandler());
    router.registerHandler(new TaskCreationHandler());
    router.registerHandler(new TaskQueryHandler());
    router.registerHandler(new WorkloadAnalysisHandler());
    
    console.log('[TaskManagerAIAgent] Task Manager handlers registered');
  }

  /**
   * Register Task Manager specific constraints
   */
  private registerTaskManagerConstraints(): void {
    const validator = this.getConstraintValidator();
    
    // Task Manager specific constraints
    validator.registerConstraint({
      id: 'task-manager-no-delete',
      name: 'Cannot Delete Tasks',
      description: 'Task Manager AI cannot delete tasks, only staff can',
      severity: 'high',
      check: (response: Response) => {
        const lowerContent = response.content.toLowerCase();
        return !(lowerContent.includes('delete') && lowerContent.includes('task'));
      },
      suggestedFix: (response: Response) => {
        return "I can't delete tasks directly. Would you like me to mark it as cancelled, or would you prefer to delete it yourself?";
      }
    });
    
    validator.registerConstraint({
      id: 'task-manager-confirm-assignments',
      name: 'Confirm Task Assignments',
      description: 'Task Manager AI must confirm before assigning tasks to staff',
      severity: 'medium',
      check: (response: Response) => {
        const lowerContent = response.content.toLowerCase();
        if (lowerContent.includes('assign') && lowerContent.includes('task')) {
          // Check if response asks for confirmation
          return lowerContent.includes('?') || lowerContent.includes('confirm') || lowerContent.includes('would you like');
        }
        return true;
      },
      suggestedFix: (response: Response) => {
        return response.content + "\n\nWould you like me to proceed with this assignment?";
      }
    });
    
    console.log('[TaskManagerAIAgent] Task Manager constraints registered');
  }

  /**
   * Override to provide custom greeting handler
   */
  protected hasCustomGreetingHandler(): boolean {
    return true; // Use TaskManagerGreetingHandler
  }

  /**
   * Get knowledge context for Task Manager AI
   * This is called by BaseAgent's LLM generation
   */
  getKnowledgeContext(): string {
    return `You are McCarthy Task Manager AI, an intelligent coordinator helping staff manage tasks and projects.

Your Role:
- Help staff create, update, and manage tasks
- Provide insights on task status and team workload
- Suggest task assignments based on staff availability and expertise
- Track project progress and deadlines
- Coordinate team collaboration
- Answer questions about tasks and projects
- Learn from staff feedback to improve over time

Capabilities:
- Search and filter tasks by any criteria
- Create new tasks with all details
- Update task status, priority, assignments
- Assign tasks to team members
- Provide task summaries and reports
- Track overdue and upcoming tasks
- Suggest task prioritization
- Analyze team workload
- Identify bottlenecks

Communication Style:
- Professional but friendly
- Concise and action-oriented
- Proactive with suggestions
- Clear about what actions you can take
- Always ask for confirmation on important changes
- Use natural language, avoid technical jargon

Important Rules:
- NEVER delete tasks (only staff can delete)
- ALWAYS confirm before assigning tasks to staff
- ALWAYS be honest if you don't know something
- NEVER make promises you cannot keep
- ALWAYS prioritize urgent tasks
- ALWAYS consider workload balance when suggesting assignments`;
  }

  /**
   * Process a message with Task Manager specific context
   */
  async processMessage(message: string, sessionId?: string): Promise<Response> {
    // Extract task context if present (e.g., [Task: TSK-123])
    const taskMatch = message.match(/\[Task: (TSK-\d+)\]/);
    if (taskMatch) {
      const taskNumber = taskMatch[1];
      console.log(`[TaskManagerAIAgent] Found task context: ${taskNumber}`);
      
      // Load or create session first
      const effectiveSessionId = sessionId || this.state?.sessionId;
      if (!this.state) {
        this.state = await this.loadOrCreateSession(effectiveSessionId);
      }
      
      // Store current task context in session metadata
      this.state.metadata.currentTask = taskNumber;
      
      // Save the updated state
      await this.stateManager.saveSession(this.state);
      console.log(`[TaskManagerAIAgent] Task context stored: ${taskNumber}`);
      
      // Remove task context from message before processing
      message = message.replace(/\[Task: TSK-\d+\]/, '').trim();
    }
    
    // Call parent processMessage
    return super.processMessage(message, sessionId);
  }

  /**
   * Get current task context from session
   */
  getCurrentTaskContext(): string | null {
    return this.state?.metadata?.currentTask || null;
  }

  /**
   * Search task knowledge base using VectorRAG
   */
  async searchTaskKnowledge(query: string): Promise<any> {
    console.log(`[TaskManagerAIAgent] Searching task knowledge base: "${query}"`);
    const vectorRAG = this.getVectorRAG();
    const results = await vectorRAG.search(query, 5);
    console.log(`[TaskManagerAIAgent] Found ${results.chunks.length} relevant chunks`);
    return results;
  }

  /**
   * Ingest task management documentation
   */
  async ingestTaskDocumentation(title: string, content: string): Promise<void> {
    console.log(`[TaskManagerAIAgent] Ingesting task documentation: ${title}`);
    await this.ingestDocument(title, content, 'task_management');
  }
}

