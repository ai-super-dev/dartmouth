import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SwarmCoordinator } from '../src/SwarmCoordinator';
import type { Env } from '../src/types';

// Mock AgentCommunication and AgentRegistry
vi.mock('../src/AgentCommunication');
vi.mock('../src/AgentRegistry');

describe('SwarmCoordinator', () => {
  let mockEnv: Env;
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    // Mock D1Database
    const mockDB = {
      prepare: vi.fn(),
    };

    mockEnv = {
      DB: mockDB as any,
    } as Env;

    coordinator = new SwarmCoordinator(mockEnv);
  });

  describe('coordinateSwarm', () => {
    it('should coordinate a swarm task with available agents', async () => {
      // Mock AgentRegistry.findByCapability
      const mockRegistry = (coordinator as any).registry;
      mockRegistry.findByCapability = vi.fn().mockResolvedValue([
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'pa',
          status: 'active',
          healthStatus: 'healthy',
          capabilities: ['voice'],
          lastSeen: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      // Mock AgentCommunication.sendMessage
      const mockCommunication = (coordinator as any).communication;
      mockCommunication.sendMessage = vi.fn().mockResolvedValue({
        id: 'msg-1',
        status: 'pending',
      });

      const task = {
        description: 'Test swarm task',
        requiredCapabilities: ['voice'],
        data: { test: 'data' },
        coordinatorId: 'coordinator-1',
      };

      const result = await coordinator.coordinateSwarm(task);

      expect(result.id).toMatch(/^swarm_/);
      expect(result.description).toBe('Test swarm task');
      expect(result.status).toBe('in_progress');
      expect(result.assignedAgents).toHaveLength(1);
    });

    it('should throw error if no agents available', async () => {
      // Mock AgentRegistry.findByCapability to return empty array
      const mockRegistry = (coordinator as any).registry;
      mockRegistry.findByCapability = vi.fn().mockResolvedValue([]);

      const task = {
        description: 'Test swarm task',
        requiredCapabilities: ['voice'],
        data: { test: 'data' },
        coordinatorId: 'coordinator-1',
      };

      await expect(coordinator.coordinateSwarm(task)).rejects.toThrow('No agents available for swarm task');
    });
  });

  describe('getSwarmResults', () => {
    it('should get swarm task results', async () => {
      // Mock AgentCommunication.getMessages
      const mockCommunication = (coordinator as any).communication;
      mockCommunication.getMessages = vi.fn().mockResolvedValue([
        {
          id: 'msg-1',
          fromAgentId: 'agent-1',
          content: { swarmId: 'swarm-1' },
          status: 'completed',
          response: { result: 'success' },
        },
      ]);

      const results = await coordinator.getSwarmResults('swarm-1');

      expect(results).toHaveProperty('agent-1');
      expect(results['agent-1']).toEqual({ result: 'success' });
    });

    it('should return empty object if no results found', async () => {
      // Mock AgentCommunication.getMessages to return empty array
      const mockCommunication = (coordinator as any).communication;
      mockCommunication.getMessages = vi.fn().mockResolvedValue([]);

      const results = await coordinator.getSwarmResults('swarm-1');

      expect(results).toEqual({});
    });
  });
});
