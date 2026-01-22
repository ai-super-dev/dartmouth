import type { Env, Agent } from './types';

export class AgentRegistry {
  constructor(private env: Env) {}

  /**
   * Register a new agent
   */
  async registerAgent(agent: Omit<Agent, 'createdAt' | 'updatedAt' | 'lastSeen'>): Promise<Agent> {
    const now = Date.now();
    
    const fullAgent: Agent = {
      ...agent,
      status: agent.status || 'active',
      healthStatus: agent.healthStatus || 'healthy',
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO agent_registry (
        id, name, type, description, capabilities, status, 
        health_status, version, endpoint_url, metadata, 
        last_seen, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fullAgent.id,
      fullAgent.name,
      fullAgent.type,
      fullAgent.description || null,
      JSON.stringify(fullAgent.capabilities),
      fullAgent.status,
      fullAgent.healthStatus,
      fullAgent.version || null,
      fullAgent.endpointUrl || null,
      fullAgent.metadata ? JSON.stringify(fullAgent.metadata) : null,
      fullAgent.lastSeen,
      fullAgent.createdAt,
      fullAgent.updatedAt
    ).run();

    console.log(`[AgentRegistry] Registered agent: ${fullAgent.name} (${fullAgent.id})`);
    
    return fullAgent;
  }

  /**
   * Get all agents
   */
  async listAgents(filters?: {
    type?: string;
    status?: string;
    capability?: string;
  }): Promise<Agent[]> {
    let query = 'SELECT * FROM agent_registry WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY name ASC';

    const result = await this.env.DB.prepare(query).bind(...params).all();

    const agents = result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      capabilities: JSON.parse(row.capabilities || '[]'),
      status: row.status,
      healthStatus: row.health_status,
      version: row.version,
      endpointUrl: row.endpoint_url,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      lastSeen: row.last_seen,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Filter by capability if specified
    if (filters?.capability) {
      return agents.filter(agent => 
        agent.capabilities.includes(filters.capability!)
      );
    }

    return agents;
  }

  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<Agent | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM agent_registry WHERE id = ?'
    ).bind(id).first();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      type: result.type,
      description: result.description,
      capabilities: JSON.parse(result.capabilities || '[]'),
      status: result.status,
      healthStatus: result.health_status,
      version: result.version,
      endpointUrl: result.endpoint_url,
      metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
      lastSeen: result.last_seen,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * Update agent health status
   */
  async updateHealth(id: string, healthStatus: 'healthy' | 'degraded' | 'unhealthy'): Promise<void> {
    const now = Date.now();
    
    await this.env.DB.prepare(`
      UPDATE agent_registry 
      SET health_status = ?, last_seen = ?, updated_at = ?
      WHERE id = ?
    `).bind(healthStatus, now, now, id).run();

    console.log(`[AgentRegistry] Updated health for ${id}: ${healthStatus}`);
  }

  /**
   * Heartbeat - agent reports it's alive
   */
  async heartbeat(id: string): Promise<void> {
    const now = Date.now();
    
    await this.env.DB.prepare(`
      UPDATE agent_registry 
      SET last_seen = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, id).run();
  }

  /**
   * Find agents by capability
   */
  async findByCapability(capability: string): Promise<Agent[]> {
    return this.listAgents({ capability });
  }

  /**
   * Deregister agent
   */
  async deregisterAgent(id: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE agent_registry 
      SET status = 'inactive', updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), id).run();

    console.log(`[AgentRegistry] Deregistered agent: ${id}`);
  }
}
