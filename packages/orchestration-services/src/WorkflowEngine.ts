import type { Env, Workflow, WorkflowStep } from './types';
import { AgentCommunication } from './AgentCommunication';

export class WorkflowEngine {
  private communication: AgentCommunication;

  constructor(private env: Env) {
    this.communication = new AgentCommunication(env);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: {
    name: string;
    description?: string;
    steps: WorkflowStep[];
    inputData?: Record<string, any>;
    createdBy: string;
  }): Promise<Workflow> {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const fullWorkflow: Workflow = {
      id: workflowId,
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps,
      currentStep: 0,
      status: 'pending',
      inputData: workflow.inputData,
      createdBy: workflow.createdBy,
      createdAt: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO workflows (
        id, name, description, steps, current_step, status,
        input_data, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fullWorkflow.id,
      fullWorkflow.name,
      fullWorkflow.description || null,
      JSON.stringify(fullWorkflow.steps),
      fullWorkflow.currentStep,
      fullWorkflow.status,
      fullWorkflow.inputData ? JSON.stringify(fullWorkflow.inputData) : null,
      fullWorkflow.createdBy,
      fullWorkflow.createdAt
    ).run();

    console.log(`[WorkflowEngine] Created workflow: ${fullWorkflow.name} (${fullWorkflow.id})`);

    return fullWorkflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string): Promise<Workflow> {
    // Get workflow
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'pending' && workflow.status !== 'paused') {
      throw new Error(`Workflow cannot be executed in status: ${workflow.status}`);
    }

    // Update status to running
    await this.updateWorkflowStatus(workflowId, 'running');
    workflow.status = 'running';
    workflow.startedAt = Date.now();

    try {
      // Execute steps sequentially
      let previousOutput = workflow.inputData || {};

      for (let i = workflow.currentStep; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        console.log(`[WorkflowEngine] Executing step ${i + 1}/${workflow.steps.length}: ${step.name}`);

        // Check condition if specified
        if (step.condition && !this.evaluateCondition(step.condition, previousOutput)) {
          console.log(`[WorkflowEngine] Skipping step ${i + 1}: condition not met`);
          continue;
        }

        // Prepare input (can reference previous output)
        const stepInput = this.prepareStepInput(step.input, previousOutput);

        // Execute step
        try {
          const stepOutput = await this.executeStep(workflow.id, step, stepInput);
          previousOutput = { ...previousOutput, [`step${i + 1}`]: stepOutput };

          // Update current step
          workflow.currentStep = i + 1;
          await this.updateWorkflowStep(workflowId, i + 1);

        } catch (error: any) {
          console.error(`[WorkflowEngine] Step ${i + 1} failed:`, error);

          // Handle error based on step configuration
          if (step.onError === 'stop' || !step.onError) {
            throw error;
          } else if (step.onError === 'continue') {
            console.log(`[WorkflowEngine] Continuing despite error in step ${i + 1}`);
            continue;
          } else if (step.onError === 'retry') {
            // Implement retry logic with exponential backoff
            const maxRetries = step.retryCount || 3; // Default to 3 retries
            let retryAttempt = 0;

            while (retryAttempt < maxRetries) {
              retryAttempt++;
              const delay = Math.pow(2, retryAttempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
              
              console.log(`[WorkflowEngine] Retrying step ${i + 1}, attempt ${retryAttempt}/${maxRetries} after ${delay}ms delay...`);
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, delay));

              try {
                // Retry the step execution
                const stepOutput = await this.executeStep(workflow.id, step, stepInput);
                previousOutput = { ...previousOutput, [`step${i + 1}`]: stepOutput };

                // Update current step
                workflow.currentStep = i + 1;
                await this.updateWorkflowStep(workflowId, i + 1);

                console.log(`[WorkflowEngine] Step ${i + 1} succeeded on retry attempt ${retryAttempt}`);
                break; // Success, exit retry loop
              } catch (retryError: any) {
                console.error(`[WorkflowEngine] Step ${i + 1} retry attempt ${retryAttempt} failed:`, retryError);
                
                // If this was the last retry, throw the error
                if (retryAttempt >= maxRetries) {
                  console.error(`[WorkflowEngine] Step ${i + 1} failed after ${maxRetries} retry attempts`);
                  throw new Error(`Step ${i + 1} (${step.name}) failed after ${maxRetries} retry attempts: ${retryError.message}`);
                }
              }
            }
          }
        }
      }

      // Workflow completed successfully
      workflow.status = 'completed';
      workflow.outputData = previousOutput;
      workflow.completedAt = Date.now();

      await this.completeWorkflow(workflowId, previousOutput);

      console.log(`[WorkflowEngine] Workflow completed: ${workflow.name}`);

      return workflow;

    } catch (error: any) {
      // Workflow failed
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.completedAt = Date.now();

      await this.failWorkflow(workflowId, error.message);

      console.error(`[WorkflowEngine] Workflow failed: ${workflow.name}`, error);

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    workflowId: string,
    step: WorkflowStep,
    input: Record<string, any>
  ): Promise<any> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Log step execution start
    await this.env.DB.prepare(`
      INSERT INTO workflow_executions (
        id, workflow_id, step_number, agent_id, status,
        input_data, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      executionId,
      workflowId,
      step.stepNumber,
      step.agentId,
      'pending',
      JSON.stringify(input),
      startTime
    ).run();

    try {
      // Invoke agent to perform task
      const result = await this.communication.invokeAgent({
        fromAgentId: 'workflow-engine',
        toAgentId: step.agentId,
        task: step.task,
        data: input,
        timeout: 60000, // 60 seconds per step
      });

      // Log step execution success
      await this.env.DB.prepare(`
        UPDATE workflow_executions
        SET status = 'completed', output_data = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(result),
        Date.now(),
        executionId
      ).run();

      return result;

    } catch (error: any) {
      // Log step execution failure
      await this.env.DB.prepare(`
        UPDATE workflow_executions
        SET status = 'failed', error = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        error.message,
        Date.now(),
        executionId
      ).run();

      throw error;
    }
  }

  /**
   * Prepare step input (resolve references to previous steps)
   */
  private prepareStepInput(
    input: Record<string, any> | string,
    context: Record<string, any>
  ): Record<string, any> {
    if (typeof input === 'string') {
      // Simple string reference
      return context[input] || {};
    }

    // Object with possible references
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to previous step output
        const ref = value.substring(1);
        resolved[key] = context[ref];
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    try {
      // Replace context variables in condition
      let evalCondition = condition;
      for (const [key, value] of Object.entries(context)) {
        evalCondition = evalCondition.replace(new RegExp(`\\$${key}`, 'g'), JSON.stringify(value));
      }
      return eval(evalCondition);
    } catch {
      return false;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    const result: any = await this.env.DB.prepare(
      'SELECT * FROM workflows WHERE id = ?'
    ).bind(id).first();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      steps: JSON.parse(result.steps),
      currentStep: result.current_step,
      status: result.status,
      inputData: result.input_data ? JSON.parse(result.input_data) : undefined,
      outputData: result.output_data ? JSON.parse(result.output_data) : undefined,
      error: result.error,
      createdBy: result.created_by,
      createdAt: result.created_at,
      startedAt: result.started_at,
      completedAt: result.completed_at,
    };
  }

  /**
   * Update workflow status
   */
  private async updateWorkflowStatus(id: string, status: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE workflows SET status = ?, started_at = ? WHERE id = ?
    `).bind(status, Date.now(), id).run();
  }

  /**
   * Update workflow current step
   */
  private async updateWorkflowStep(id: string, step: number): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE workflows SET current_step = ? WHERE id = ?
    `).bind(step, id).run();
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(id: string, output: Record<string, any>): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE workflows 
      SET status = 'completed', output_data = ?, completed_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(output), Date.now(), id).run();
  }

  /**
   * Fail workflow
   */
  private async failWorkflow(id: string, error: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE workflows 
      SET status = 'failed', error = ?, completed_at = ?
      WHERE id = ?
    `).bind(error, Date.now(), id).run();
  }
}
