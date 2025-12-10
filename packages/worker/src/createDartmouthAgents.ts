/**
 * Factory functions to create Dartmouth OS compatible agents
 */

import type { Agent } from '../../dartmouth-core/src/types';
import { DartmouthAgentAdapter } from './DartmouthAgentAdapter';
import { BaseAgent, BaseAgentConfig } from './BaseAgent';
import { McCarthyArtworkAgent } from '../../mccarthy-artwork/src/McCarthyArtworkAgent';
import { TaskManagerAIAgent } from './agents/TaskManagerAIAgent';
import type { AgentConfig } from './types/shared';

/**
 * Create FAM (Foundational Agent McCarthy)
 */
export function createFAMAgent(config: BaseAgentConfig): Agent {
  return new DartmouthAgentAdapter(config, {
    id: 'fam',
    name: 'Foundational Agent McCarthy (FAM)',
    version: '1.0.0',
    description: 'Pure foundational agent with core conversational intelligence, sentiment analysis, and memory',
    capabilities: [
      { name: 'conversation', description: 'Natural conversation with context and memory', enabled: true },
      { name: 'sentiment', description: 'Sentiment analysis and emotion detection', enabled: true },
      { name: 'memory', description: 'Long-term conversation memory', enabled: true },
      { name: 'intent', description: 'Intent detection and classification', enabled: true },
    ],
  });
}

/**
 * Create McCarthy Artwork Analyzer Agent
 */
export function createArtworkAnalyzerAgent(config: BaseAgentConfig): Agent {
  // Create specialized BaseAgentConfig for McCarthyArtworkAgent
  const artworkConfig: BaseAgentConfig = {
    ...config,
    agentId: 'mccarthy-artwork',
    agentConfig: {
      ...config.agentConfig,
      agentId: 'mccarthy-artwork',
      name: 'McCarthy Artwork Analyzer',
      description: 'Specialized agent for artwork analysis, DPI calculations, and print preparation guidance',
      version: '1.0.0',
      systemPrompt: '', // McCarthyArtworkAgent sets its own system prompt
    },
  };

  // Create McCarthyArtworkAgent instance (extends BaseAgent with specialized handlers)
  const artworkAgent = new McCarthyArtworkAgent(artworkConfig);

  // Wrap with Dartmouth adapter
  return new DartmouthAgentAdapter(artworkAgent, {
    id: 'mccarthy-artwork',
    name: 'McCarthy Artwork Analyzer',
    version: '1.0.0',
    description: 'Specialized agent for artwork analysis, DPI calculations, and print preparation guidance',
    capabilities: [
      { name: 'conversation', description: 'Natural conversation with context and memory', enabled: true },
      { name: 'sentiment', description: 'Sentiment analysis and emotion detection', enabled: true },
      { name: 'memory', description: 'Long-term conversation memory', enabled: true },
      { name: 'intent', description: 'Intent detection and classification', enabled: true },
      { name: 'calculations', description: 'DPI and print size calculations', enabled: true },
      { name: 'artwork-analysis', description: 'Artwork quality assessment', enabled: true },
      { name: 'rag', description: 'DTF/UV DTF knowledge base', enabled: true },
    ],
  });
}

/**
 * Create McCarthy Task Manager AI Agent
 */
export function createTaskManagerAIAgent(config: BaseAgentConfig): Agent {
  // Create specialized BaseAgentConfig for TaskManagerAIAgent
  const taskManagerConfig: BaseAgentConfig = {
    ...config,
    agentId: 'mccarthy-task-manager',
    agentConfig: {
      ...config.agentConfig,
      agentId: 'mccarthy-task-manager',
      name: 'McCarthy Task Manager AI',
      description: 'Intelligent AI coordinator for task management and team coordination',
      version: '2.0.0',
      systemPrompt: '', // TaskManagerAIAgent sets its own system prompt
    },
  };

  // Create TaskManagerAIAgent instance (extends BaseAgent with VectorRAG)
  const taskManagerAgent = new TaskManagerAIAgent(taskManagerConfig);

  // Wrap with Dartmouth adapter
  return new DartmouthAgentAdapter(taskManagerAgent, {
    id: 'mccarthy-task-manager',
    name: 'McCarthy Task Manager AI',
    version: '2.0.0',
    description: 'Intelligent AI coordinator for task management and team coordination',
    capabilities: [
      { name: 'conversation', description: 'Natural conversation with context and memory', enabled: true },
      { name: 'sentiment', description: 'Sentiment analysis and emotion detection', enabled: true },
      { name: 'memory', description: 'Long-term conversation memory', enabled: true },
      { name: 'intent', description: 'Intent detection and classification', enabled: true },
      { name: 'task-creation', description: 'Natural language task creation', enabled: true },
      { name: 'task-query', description: 'Task status and progress queries', enabled: true },
      { name: 'workload-analysis', description: 'Team workload analysis', enabled: true },
      { name: 'rlhf', description: 'Learning from staff feedback', enabled: true },
      { name: 'vector-rag', description: 'Task management knowledge base', enabled: true },
    ],
  });
}

/**
 * Create a test agent (for development/testing)
 */
export function createTestAgent(config: BaseAgentConfig): Agent {
  return new DartmouthAgentAdapter(config, {
    id: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    description: 'Simple test agent for development and testing',
    capabilities: [
      { name: 'conversation', description: 'Basic conversation', enabled: true },
    ],
  });
}

/**
 * Get agent factory by ID
 */
export function getAgentFactory(agentId: string): ((config: BaseAgentConfig) => Agent) | null {
  const factories: Record<string, (config: BaseAgentConfig) => Agent> = {
    'fam': createFAMAgent,
    'mccarthy-artwork': createArtworkAnalyzerAgent,
    'mccarthy-task-manager': createTaskManagerAIAgent,
    'test-agent': createTestAgent,
  };

  return factories[agentId] || null;
}

