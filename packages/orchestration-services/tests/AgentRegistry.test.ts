import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRegistry } from '../src/AgentRegistry';
import type { Env } from '../src/types';

describe('AgentRegistry', () => {
  let mockEnv: Env;
  let registry: AgentRegistry;

  beforeEach(() => {
    // Mock D1Database
    const mockDB = {
      prepare: vi.fn(),
    };

    mockEnv = {
      DB: mockDB as any,
    } as Env;

    registry = new AgentRegistry(mockEnv);
  });

  describe('registerAgent', () => {
    it('should register a new agent with all required fields', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const agentData = {
        id: 'test-agent-1',
        name: 'Test Agent',
        type: 'pa',
        description: 'Test agent description',
        capabilities: ['voice', 'vision'],
        status: 'active' as const,
        healthStatus: 'healthy' as const,
      };

      const result = await registry.registerAgent(agentData);

      expect(result.id).toBe('test-agent-1');
      expect(result.name).toBe('Test Agent');
      expect(result.type).toBe('pa');
      expect(result.status).toBe('active');
      expect(result.healthStatus).toBe('healthy');
      expect(result.capabilities).toEqual(['voice', 'vision']);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.lastSeen).toBeDefined();
    });

    it('should set default status and healthStatus if not provided', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const agentData = {
        id: 'test-agent-2',
        name: 'Test Agent 2',
        type: 'customer-service',
        capabilities: [],
      };

      const result = await registry.registerAgent(agentData);

      expect(result.status).toBe('active');
      expect(result.healthStatus).toBe('healthy');
    });
  });

  describe('listAgents', () => {
    it('should list all agents without filters', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'pa',
          description: 'Test',
          capabilities: '["voice"]',
          status: 'active',
          health_status: 'healthy',
          version: null,
          endpoint_url: null,
          metadata: null,
          last_seen: Date.now(),
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockAgents });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await registry.listAgents();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('agent-1');
      expect(result[0].capabilities).toEqual(['voice']);
    });

    it('should filter agents by type', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await registry.listAgents({ type: 'pa' });

      expect(mockBind).toHaveBeenCalledWith('pa');
    });

    it('should filter agents by capability', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'pa',
          capabilities: '["voice", "vision"]',
          status: 'active',
          health_status: 'healthy',
          last_seen: Date.now(),
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'pa',
          capabilities: '["voice"]',
          status: 'active',
          health_status: 'healthy',
          last_seen: Date.now(),
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockAgents });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await registry.listAgents({ capability: 'vision' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('agent-1');
    });
  });

  describe('getAgent', () => {
    it('should get agent by ID', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'pa',
        capabilities: '["voice"]',
        status: 'active',
        health_status: 'healthy',
        last_seen: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const mockFirst = vi.fn().mockResolvedValue(mockAgent);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await registry.getAgent('agent-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('agent-1');
      expect(result?.capabilities).toEqual(['voice']);
    });

    it('should return null if agent not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await registry.getAgent('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateHealth', () => {
    it('should update agent health status', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await registry.updateHealth('agent-1', 'degraded');

      expect(mockBind).toHaveBeenCalledWith('degraded', expect.any(Number), expect.any(Number), 'agent-1');
    });
  });

  describe('heartbeat', () => {
    it('should update last seen timestamp', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await registry.heartbeat('agent-1');

      expect(mockBind).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'agent-1');
    });
  });

  describe('findByCapability', () => {
    it('should find agents by capability', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'pa',
          capabilities: '["voice"]',
          status: 'active',
          health_status: 'healthy',
          last_seen: Date.now(),
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockAgents });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      const result = await registry.findByCapability('voice');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('agent-1');
    });
  });

  describe('deregisterAgent', () => {
    it('should set agent status to inactive', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: mockBind,
      });

      await registry.deregisterAgent('agent-1');

      expect(mockBind).toHaveBeenCalledWith(expect.any(Number), 'agent-1');
    });
  });
});
