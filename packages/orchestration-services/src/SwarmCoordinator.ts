import type { Env, SwarmTask } from './types';
import { AgentCommunication } from './AgentCommunication';
import { AgentRegistry } from './AgentRegistry';

export class SwarmCoordinator {
  private communication: AgentCommunication;
  private registry: AgentRegistry;

  constructor(private env: Env) {
    this.communication = new AgentCommunication(env);
    this.registry = new AgentRegistry(env);
  }

  /**
   * Coordinate a swarm task across multiple agents
   */
  async coordinateSwarm(task: {
    description: string;
    requiredCapabilities: string[];
    data: Record<string, any>;
    coordinatorId: string;
  }): Promise<SwarmTask> {
    console.log(`[SwarmCoordinator] Starting swarm task: ${task.description}`);

    const taskId = `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Find agents with required capabilities
    const availableAgents: string[] = [];
    
    for (const capability of task.requiredCapabilities) {
      const agents = await this.registry.findByCapability(capability);
      const activeAgents = agents.filter(a => a.status === 'active' && a.healthStatus === 'healthy');
      
      if (activeAgents.length > 0) {
        availableAgents.push(activeAgents[0].id); // Pick first available
      }
    }

    if (availableAgents.length === 0) {
      throw new Error('No agents available for swarm task');
    }

    const swarmTask: SwarmTask = {
      id: taskId,
      description: task.description,
      requiredCapabilities: task.requiredCapabilities,
      data: task.data,
      coordinatorId: task.coordinatorId,
      status: 'assigned',
      assignedAgents: availableAgents,
      results: {},
      createdAt: Date.now(),
    };

    // Assign task to all agents in parallel
    const agentPromises = availableAgents.map(agentId => 
      this.communication.sendMessage({
        fromAgentId: task.coordinatorId,
        toAgentId: agentId,
        messageType: 'task',
        content: {
          swarmId: taskId,
          description: task.description,
          data: task.data,
        },
        priority: 'high',
      })
    );

    await Promise.all(agentPromises);

    swarmTask.status = 'in_progress';

    console.log(`[SwarmCoordinator] Task assigned to ${availableAgents.length} agents`);

    // Collect results (in real implementation, this would be event-driven)
    // For now, return the swarm task structure
    return swarmTask;
  }

  /**
   * Get swarm task results
   */
  async getSwarmResults(swarmId: string): Promise<Record<string, any>> {
    // In production, query results from agent_messages table
    // and aggregate responses from all agents in the swarm
    const messages = await this.communication.getMessages('swarm-coordinator');
    const swarmMessages = messages.filter(msg => 
      msg.content?.swarmId === swarmId && msg.status === 'completed'
    );

    const results: Record<string, any> = {};
    for (const msg of swarmMessages) {
      if (msg.response) {
        results[msg.fromAgentId] = msg.response;
      }
    }

    return results;
  }
}
