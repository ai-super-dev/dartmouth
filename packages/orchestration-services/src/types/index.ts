/**
 * Orchestration Services Types
 */

export interface Env {
  DB: D1Database;
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  name: string;
  type: string; // 'pa', 'customer-service', 'artwork-analyzer', etc.
  description?: string;
  capabilities: string[]; // ['voice', 'vision', 'calendar', etc.]
  status: 'active' | 'inactive' | 'error';
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  endpointUrl?: string;
  metadata?: Record<string, any>;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  messageType: 'task' | 'query' | 'response' | 'notification';
  content: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: Record<string, any>;
  error?: string;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
}

export interface WorkflowStep {
  stepNumber: number;
  name: string;
  agentId: string;
  task: string;
  input: Record<string, any> | string; // Can reference previous step output
  condition?: string; // Optional condition to execute step
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  error?: string;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface SwarmTask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  data: Record<string, any>;
  coordinatorId: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assignedAgents: string[];
  results: Record<string, any>;
  createdAt: number;
  completedAt?: number;
}
