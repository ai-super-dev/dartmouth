import type { Env, AgentMessage } from './types';
import { AgentRegistry } from './AgentRegistry';

export class AgentCommunication {
  private registry: AgentRegistry;

  constructor(private env: Env) {
    this.registry = new AgentRegistry(env);
  }

  /**
   * Send message from one agent to another
   */
  async sendMessage(message: {
    fromAgentId: string;
    toAgentId: string;
    messageType: 'task' | 'query' | 'response' | 'notification';
    content: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<AgentMessage> {
    // Verify both agents exist
    const fromAgent = await this.registry.getAgent(message.fromAgentId);
    const toAgent = await this.registry.getAgent(message.toAgentId);

    if (!fromAgent) {
      throw new Error(`Source agent not found: ${message.fromAgentId}`);
    }

    if (!toAgent) {
      throw new Error(`Target agent not found: ${message.toAgentId}`);
    }

    if (toAgent.status !== 'active') {
      throw new Error(`Target agent is not active: ${message.toAgentId}`);
    }

    // Create message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const agentMessage: AgentMessage = {
      id: messageId,
      fromAgentId: message.fromAgentId,
      toAgentId: message.toAgentId,
      messageType: message.messageType,
      content: message.content,
      priority: message.priority || 'normal',
      status: 'pending',
      createdAt: now,
    };

    // Store message
    await this.env.DB.prepare(`
      INSERT INTO agent_messages (
        id, from_agent_id, to_agent_id, message_type, content,
        priority, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      agentMessage.id,
      agentMessage.fromAgentId,
      agentMessage.toAgentId,
      agentMessage.messageType,
      JSON.stringify(agentMessage.content),
      agentMessage.priority,
      agentMessage.status,
      agentMessage.createdAt
    ).run();

    console.log(`[AgentCommunication] Message sent: ${fromAgent.name} → ${toAgent.name} (${message.messageType})`);

    // If target agent has endpoint, deliver immediately
    if (toAgent.endpointUrl) {
      await this.deliverMessage(agentMessage, toAgent.endpointUrl);
    }

    return agentMessage;
  }

  /**
   * Deliver message to agent endpoint
   */
  private async deliverMessage(message: AgentMessage, endpointUrl: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateMessageStatus(message.id, 'processing');

      // Call agent endpoint
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          from: message.fromAgentId,
          type: message.messageType,
          content: message.content,
          priority: message.priority,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent endpoint returned ${response.status}`);
      }

      const result = await response.json();

      // Update message with response
      await this.completeMessage(message.id, result);

    } catch (error: any) {
      console.error(`[AgentCommunication] Delivery failed:`, error);
      await this.failMessage(message.id, error.message || 'Unknown error');
    }
  }

  /**
   * Get messages for an agent
   */
  async getMessages(agentId: string, status?: string): Promise<AgentMessage[]> {
    let query = 'SELECT * FROM agent_messages WHERE to_agent_id = ?';
    const params: any[] = [agentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await this.env.DB.prepare(query).bind(...params).all();

    return result.results.map((row: any) => ({
      id: row.id,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      messageType: row.message_type,
      content: JSON.parse(row.content),
      priority: row.priority,
      status: row.status,
      response: row.response ? JSON.parse(row.response) : undefined,
      error: row.error,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      completedAt: row.completed_at,
    }));
  }

  /**
   * Update message status
   */
  private async updateMessageStatus(messageId: string, status: string): Promise<void> {
    const now = Date.now();
    
    await this.env.DB.prepare(`
      UPDATE agent_messages 
      SET status = ?, processed_at = ?
      WHERE id = ?
    `).bind(status, now, messageId).run();
  }

  /**
   * Complete message with response
   */
  private async completeMessage(messageId: string, response: any): Promise<void> {
    const now = Date.now();
    
    await this.env.DB.prepare(`
      UPDATE agent_messages 
      SET status = 'completed', response = ?, completed_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(response), now, messageId).run();
  }

  /**
   * Fail message with error
   */
  private async failMessage(messageId: string, error: string): Promise<void> {
    const now = Date.now();
    
    await this.env.DB.prepare(`
      UPDATE agent_messages 
      SET status = 'failed', error = ?, completed_at = ?
      WHERE id = ?
    `).bind(error, now, messageId).run();
  }

  /**
   * Invoke another agent (send task and wait for response)
   */
  async invokeAgent(request: {
    fromAgentId: string;
    toAgentId: string;
    task: string;
    data: Record<string, any>;
    timeout?: number; // milliseconds
  }): Promise<any> {
    // Send task message
    const message = await this.sendMessage({
      fromAgentId: request.fromAgentId,
      toAgentId: request.toAgentId,
      messageType: 'task',
      content: {
        task: request.task,
        data: request.data,
      },
      priority: 'normal',
    });

    // Wait for response (poll for timeout period)
    const timeout = request.timeout || 30000; // 30 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check message status
      const result: any = await this.env.DB.prepare(
        'SELECT status, response, error FROM agent_messages WHERE id = ?'
      ).bind(message.id).first();

      if (result.status === 'completed') {
        return JSON.parse(result.response || '{}');
      }

      if (result.status === 'failed') {
        throw new Error(`Agent invocation failed: ${result.error}`);
      }

      // Wait 500ms before polling again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Agent invocation timed out');
  }
}
