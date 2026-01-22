import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentCommunication } from '../src/AgentCommunication';
import type { Env } from '../src/types';

describe('AgentCommunication', () => {
  let mockEnv: Env;
  let communication: AgentCommunication;

  beforeEach(() => {
    // Mock D1Database
    const mockDB = {
      prepare: vi.fn(),
    };

    mockEnv = {
      DB: mockDB as any,
    } as Env;

    communication = new AgentCommunication(mockEnv);
  });

  describe('sendMessage', () => {
    it('should send a message between agents', async () => {
      const fromAgent = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'pa',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const toAgent = {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'customer-service',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        endpointUrl: null,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Mock AgentRegistry.getAgent calls
      const mockGetAgent = vi.fn()
        .mockResolvedValueOnce(fromAgent)
        .mockResolvedValueOnce(toAgent);

      // Mock the registry's getAgent method
      (communication as any).registry.getAgent = mockGetAgent;

      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const message = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        messageType: 'task' as const,
        content: { task: 'test task', data: {} },
        priority: 'normal' as const,
      };

      const result = await communication.sendMessage(message);

      expect(result.fromAgentId).toBe('agent-1');
      expect(result.toAgentId).toBe('agent-2');
      expect(result.messageType).toBe('task');
      expect(result.status).toBe('pending');
    });

    it('should throw error if source agent not found', async () => {
      (communication as any).registry.getAgent = vi.fn().mockResolvedValueOnce(null);

      const message = {
        fromAgentId: 'non-existent',
        toAgentId: 'agent-2',
        messageType: 'task' as const,
        content: { task: 'test' },
      };

      await expect(communication.sendMessage(message)).rejects.toThrow('Source agent not found');
    });

    it('should throw error if target agent not found', async () => {
      const fromAgent = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'pa',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (communication as any).registry.getAgent = vi.fn()
        .mockResolvedValueOnce(fromAgent)
        .mockResolvedValueOnce(null);

      const message = {
        fromAgentId: 'agent-1',
        toAgentId: 'non-existent',
        messageType: 'task' as const,
        content: { task: 'test' },
      };

      await expect(communication.sendMessage(message)).rejects.toThrow('Target agent not found');
    });

    it('should throw error if target agent is not active', async () => {
      const fromAgent = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'pa',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const toAgent = {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'customer-service',
        status: 'inactive',
        healthStatus: 'healthy',
        capabilities: [],
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (communication as any).registry.getAgent = vi.fn()
        .mockResolvedValueOnce(fromAgent)
        .mockResolvedValueOnce(toAgent);

      const message = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        messageType: 'task' as const,
        content: { task: 'test' },
      };

      await expect(communication.sendMessage(message)).rejects.toThrow('Target agent is not active');
    });
  });

  describe('getMessages', () => {
    it('should get messages for an agent', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          from_agent_id: 'agent-1',
          to_agent_id: 'agent-2',
          message_type: 'task',
          content: '{"task": "test"}',
          priority: 'normal',
          status: 'pending',
          response: null,
          error: null,
          created_at: Date.now(),
          processed_at: null,
          completed_at: null,
        },
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockMessages });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await communication.getMessages('agent-2');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
      expect(result[0].content).toEqual({ task: 'test' });
    });

    it('should filter messages by status', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await communication.getMessages('agent-2', 'completed');

      expect(mockBind).toHaveBeenCalledWith('agent-2', 'completed');
    });
  });

  describe('invokeAgent', () => {
    it('should invoke an agent and wait for response', async () => {
      const fromAgent = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'pa',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const toAgent = {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'customer-service',
        status: 'active',
        healthStatus: 'healthy',
        capabilities: [],
        endpointUrl: null,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (communication as any).registry.getAgent = vi.fn()
        .mockResolvedValueOnce(fromAgent)
        .mockResolvedValueOnce(toAgent);

      // Mock sendMessage (which is called by invokeAgent)
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      // Mock polling for response
      const mockFirst = vi.fn()
        .mockResolvedValueOnce({ status: 'pending', response: null, error: null })
        .mockResolvedValueOnce({ status: 'completed', response: '{"result": "success"}', error: null });

      (mockEnv.DB.prepare as any).mockImplementation((query: string) => {
        if (query.includes('INSERT INTO agent_messages')) {
          return { bind: mockBind };
        }
        if (query.includes('SELECT status, response, error')) {
          return { bind: vi.fn().mockReturnValue({ first: mockFirst }) };
        }
        return { bind: mockBind };
      });

      const request = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        task: 'test task',
        data: { test: 'data' },
        timeout: 1000,
      };

      // Use setTimeout to simulate async polling
      const resultPromise = communication.invokeAgent(request);

      // Wait a bit for polling
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await resultPromise;

      expect(result).toEqual({ result: 'success' });
    }, 10000);
  });
});
