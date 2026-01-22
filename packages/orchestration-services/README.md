# Orchestration Services

Orchestration Services for Dartmouth OS - Agent Registry, Communication, Workflow, and Swarm Coordination.

## Overview

This package provides services for agent-to-agent communication, workflow orchestration, and multi-agent coordination (swarms). It enables agents to discover each other, send messages, execute multi-step workflows, and coordinate complex tasks across multiple agents.

## Services

### 1. AgentRegistry

Manages agent registration, discovery, and health monitoring.

**Key Methods:**
- `registerAgent()` - Register a new agent
- `listAgents()` - List all agents with optional filters
- `getAgent()` - Get agent by ID
- `updateHealth()` - Update agent health status
- `heartbeat()` - Update last seen timestamp
- `findByCapability()` - Find agents by capability
- `deregisterAgent()` - Set agent status to inactive

### 2. AgentCommunication

Enables agents to send messages and tasks to each other.

**Key Methods:**
- `sendMessage()` - Send message from one agent to another
- `getMessages()` - Get messages for an agent
- `invokeAgent()` - Invoke another agent and wait for response

### 3. WorkflowEngine

Executes multi-step workflows, coordinating tasks across multiple agents.

**Key Methods:**
- `createWorkflow()` - Create a new workflow
- `executeWorkflow()` - Execute a workflow
- `getWorkflow()` - Get workflow by ID

### 4. SwarmCoordinator

Coordinates multiple agents working on a complex task simultaneously.

**Key Methods:**
- `coordinateSwarm()` - Coordinate a swarm task across multiple agents
- `getSwarmResults()` - Get swarm task results

## API Endpoints

All endpoints require JWT authentication via `authenticateV2` middleware.

### Agent Registry

- `GET /api/v2/agents/registry` - List all agents
- `POST /api/v2/agents/register` - Register a new agent
- `GET /api/v2/agents/:id/status` - Get agent status

### Agent Communication

- `POST /api/v2/agents/invoke` - Invoke another agent

### Workflow Engine

- `POST /api/v2/workflow/create` - Create a new workflow
- `POST /api/v2/workflow/execute` - Execute a workflow

### Swarm Coordinator

- `POST /api/v2/swarm/coordinate` - Coordinate a swarm task

### Health Check

- `GET /api/v2/orchestration/health` - Health check (no auth required)

## Database Schema

The package requires the following tables (created via migration `0049_orchestration_tables.sql`):

- `agent_registry` - Agent registration and discovery
- `agent_messages` - Inter-agent communication
- `workflows` - Workflow definitions and execution state
- `workflow_executions` - Workflow step execution logs

## Usage Example

```typescript
import { AgentRegistry, AgentCommunication, WorkflowEngine, SwarmCoordinator } from '@agent-army/orchestration-services';

// Register an agent
const registry = new AgentRegistry(env);
const agent = await registry.registerAgent({
  id: 'pa-agent-1',
  name: 'PA Agent',
  type: 'pa',
  capabilities: ['voice', 'vision', 'calendar'],
  status: 'active',
  healthStatus: 'healthy',
});

// Send a message to another agent
const communication = new AgentCommunication(env);
const message = await communication.sendMessage({
  fromAgentId: 'pa-agent-1',
  toAgentId: 'customer-service-agent',
  messageType: 'task',
  content: { task: 'Handle customer inquiry', data: {} },
  priority: 'high',
});

// Create and execute a workflow
const engine = new WorkflowEngine(env);
const workflow = await engine.createWorkflow({
  name: 'Customer Onboarding',
  steps: [
    {
      stepNumber: 1,
      name: 'Validate Customer',
      agentId: 'customer-service-agent',
      task: 'validate',
      input: { customerId: '123' },
    },
    {
      stepNumber: 2,
      name: 'Send Welcome Email',
      agentId: 'email-agent',
      task: 'send',
      input: { $step1: 'result' },
    },
  ],
  createdBy: 'pa-agent-1',
});

const result = await engine.executeWorkflow(workflow.id);

// Coordinate a swarm
const coordinator = new SwarmCoordinator(env);
const swarmTask = await coordinator.coordinateSwarm({
  description: 'Analyze customer feedback',
  requiredCapabilities: ['vision', 'nlp'],
  data: { feedback: '...' },
  coordinatorId: 'pa-agent-1',
});
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Test with Coverage

```bash
npm run test:coverage
```

## Dependencies

- `@agent-army/shared` - Shared types and utilities

## License

Part of the Dartmouth OS project.
