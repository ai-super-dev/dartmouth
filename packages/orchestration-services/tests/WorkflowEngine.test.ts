import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEngine } from '../src/WorkflowEngine';
import type { Env, WorkflowStep } from '../src/types';

// Mock AgentCommunication
vi.mock('../src/AgentCommunication');

describe('WorkflowEngine', () => {
  let mockEnv: Env;
  let engine: WorkflowEngine;

  beforeEach(() => {
    // Mock D1Database
    const mockDB = {
      prepare: vi.fn(),
    };

    mockEnv = {
      DB: mockDB as any,
    } as Env;

    engine = new WorkflowEngine(mockEnv);
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const workflowData = {
        name: 'Test Workflow',
        description: 'Test workflow description',
        steps: [
          {
            stepNumber: 1,
            name: 'Step 1',
            agentId: 'agent-1',
            task: 'test task',
            input: { test: 'data' },
          },
        ] as WorkflowStep[],
        inputData: { initial: 'data' },
        createdBy: 'user-1',
      };

      const result = await engine.createWorkflow(workflowData);

      expect(result.id).toMatch(/^wf_/);
      expect(result.name).toBe('Test Workflow');
      expect(result.status).toBe('pending');
      expect(result.currentStep).toBe(0);
      expect(result.steps).toHaveLength(1);
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow by ID', async () => {
      const mockWorkflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        description: 'Test',
        steps: '[{"stepNumber":1,"name":"Step 1","agentId":"agent-1","task":"test","input":{}}]',
        current_step: 0,
        status: 'pending',
        input_data: '{"test":"data"}',
        output_data: null,
        error: null,
        created_by: 'user-1',
        created_at: Date.now(),
        started_at: null,
        completed_at: null,
      };

      const mockFirst = vi.fn().mockResolvedValue(mockWorkflow);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await engine.getWorkflow('wf-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('wf-1');
      expect(result?.name).toBe('Test Workflow');
      expect(result?.steps).toHaveLength(1);
    });

    it('should return null if workflow not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await engine.getWorkflow('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('executeWorkflow', () => {
    it('should throw error if workflow not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await expect(engine.executeWorkflow('non-existent')).rejects.toThrow('Workflow not found');
    });

    it('should throw error if workflow cannot be executed', async () => {
      const mockWorkflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: '[]',
        current_step: 0,
        status: 'running',
        input_data: null,
        created_by: 'user-1',
        created_at: Date.now(),
      };

      const mockFirst = vi.fn().mockResolvedValue(mockWorkflow);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue(undefined);

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
        run: mockRun,
      });

      await expect(engine.executeWorkflow('wf-1')).rejects.toThrow('Workflow cannot be executed in status: running');
    });
  });
});
