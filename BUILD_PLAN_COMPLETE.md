# 🏗️ DARTMOUTH - COMPLETE BUILD PLAN

**Version:** 1.0.0  
**Date:** November 18, 2025  
**Estimated Total Time:** 25-30 hours  
**Current Progress:** 35% Complete

---

## 📊 **OVERALL PROGRESS**

```
┌─────────────────────────────────────────────────────────┐
│ DARTMOUTH BUILD PROGRESS                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Phase 1: Documentation          [██████████] 100% ✅    │
│ Phase 2: Conversation Quality   [██████████] 100% ✅    │
│ Phase 3: Foundation Refactor    [██████████] 100% ✅    │
│ Phase 4: Agent Routing          [░░░░░░░░░░]   0% ⏭️    │
│ Phase 5: Constraints System     [░░░░░░░░░░]   0%       │
│ Phase 6: McCarthy Artwork       [░░░░░░░░░░]   0%       │
│ Phase 7: Integration & Testing  [░░░░░░░░░░]   0%       │
│ Phase 8: Deploy & Validate      [░░░░░░░░░░]   0%       │
│                                                          │
│ Overall Progress: 37.5% complete                         │
│ Time Spent: ~10 hours                                    │
│ Time Remaining: ~12-15 hours                             │
│                                                          │
│ 🔒 ALL PHASES BACKED UP TO GITHUB ✅                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 **PHASE 1: DOCUMENTATION** ✅ COMPLETE

**Goal:** Create comprehensive documentation for the entire project  
**Status:** ✅ 100% Complete  
**Time Spent:** 2 hours

### **Completed:**
- [x] DARTMOUTH_BLUEPRINT.md - Complete project overview
- [x] BUILD_PLAN_COMPLETE.md - This document
- [x] WHERE_WE_ARE_NOW.md - Current status
- [x] CONVERSATION_QUALITY_REQUIREMENTS.md - Quality guidelines
- [x] ARTWORK_ANALYZER_REVIEW.md - Lessons learned
- [x] REFACTORING_PLAN.md - Technical refactoring strategy
- [x] DARTMOUTH_ARCHITECTURE_CLARITY.md - Architecture explanation
- [x] 🔒 **BACKUP TO GITHUB** - All documentation committed

### **Deliverables:**
✅ Anyone can read docs and understand Dartmouth  
✅ Can resume project from any point  
✅ Clear vision and architecture documented  
✅ Build plan defined  
✅ **Backed up to private GitHub repository**  

---

## ❤️ **PHASE 2: CONVERSATION QUALITY SYSTEM** ✅ COMPLETE

**Goal:** Build THE HEART OF DARTMOUTH - personality, empathy, validation  
**Status:** ✅ 100% Complete  
**Time Spent:** 4 hours

### **Completed:**
- [x] ConversationQualityValidator.ts (450 lines)
  - Checks verbosity, jargon, hallucinations
  - Checks repetition, promises, tone, empathy
  - Scores 0-100, must pass 70+
  
- [x] EmpathyInjector.ts (300 lines)
  - Detects user sentiment
  - Adds appropriate empathy
  - Context-aware responses
  
- [x] PersonalityPrompt.ts (200 lines)
  - Generates system prompts
  - Defines Dartmouth personality
  - Pre-built for McCarthy agents
  
- [x] Integrated into BaseAgent.ts
  - Added to message processing flow
  - Validates every response
  - Tracks quality scores

- [x] Updated all handlers with personality
  - GreetingHandler - Warm welcome
  - FallbackHandler - Helpful, not robotic
  - FrustrationHandlerImpl - Empathetic
  - RepeatHandler - Remembers context

- [x] 🔒 **BACKUP TO GITHUB** - All conversation quality code committed

### **Tasks:**

#### **Task 2.1: Update GreetingHandler** (10 min)
```typescript
// Current (Robotic):
"Hello! I'm your AI assistant. How can I help you today?"

// New (Warm & Personal):
"Hey there! 👋 I'm here to help make things easier for you. 
What are you working on today?"
```

#### **Task 2.2: Update FallbackHandler** (10 min)
```typescript
// Current (Robotic):
"I'm not sure I understand. Could you rephrase that?"

// New (Helpful):
"Hmm, I'm not quite sure what you're asking. Could you tell me 
a bit more about what you're trying to do? I'm here to help!"
```

#### **Task 2.3: Update FrustrationHandlerImpl** (10 min)
```typescript
// Current (Generic):
"I understand you're frustrated. Let me help."

// New (Empathetic):
"I can see this is frustrating - I'm really sorry about that! 
Let me help you get this sorted out right away."
```

#### **Task 2.4: Update RepeatHandler** (10 min)
```typescript
// Current (Repetitive):
"As I mentioned before..."

// New (Contextual):
"Just to recap what we discussed: [summary]. 
Is there a specific part you'd like me to explain differently?"
```

#### **Task 2.5: Add Conversation Quality Tests** (15 min)
- Test verbosity detection
- Test hallucination prevention
- Test empathy injection
- Test quality scoring

### **Deliverables:**
✅ All handlers have Dartmouth personality  
✅ Conversation quality validated  
✅ Tests passing  

---

## 🔧 **PHASE 3: FOUNDATION REFACTOR** 

**Goal:** Remove domain-specific code from foundation  
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### **Tasks:**

#### **Task 3.1: Create McCarthy Artwork Package** (30 min)
```bash
mkdir -p packages/mccarthy-artwork/src/{components,handlers,knowledge}
cd packages/mccarthy-artwork
npm init -y
```

**Files to create:**
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/McCarthyArtworkAgent.ts`

#### **Task 3.2: Move CalculationEngine** (20 min)
```
FROM: packages/worker/src/components/CalculationEngine.ts
TO:   packages/mccarthy-artwork/src/components/CalculationEngine.ts
```

**Update:**
- Remove from BaseAgent imports
- Remove from BaseAgent constructor
- Update tests

#### **Task 3.3: Move Handlers** (30 min)
```
FROM: packages/worker/src/handlers/CalculationHandler.ts
TO:   packages/mccarthy-artwork/src/handlers/CalculationHandler.ts

FROM: packages/worker/src/handlers/HowToHandler.ts
TO:   packages/mccarthy-artwork/src/handlers/HowToHandler.ts

FROM: packages/worker/src/handlers/InformationHandler.ts
TO:   packages/mccarthy-artwork/src/handlers/InformationHandler.ts
```

**Update:**
- Remove from BaseAgent handler registration
- Remove from handlers/index.ts
- Update tests

#### **Task 3.4: Copy RAG Documents** (10 min)
```
FROM: D:\coding\Artwork Analyser AI Agent\docs\RAG DOCS\
TO:   packages/mccarthy-artwork/src/knowledge/

Files:
- DTF_Artwork_Requirements.md
- UV_DTF_Artwork_Requirements.md
- DPI_QUALITY_STANDARDS.md
```

#### **Task 3.5: Update BaseAgent** (30 min)
- Remove calculationEngine property
- Remove domain-specific handler registration
- Keep only foundation handlers:
  - GreetingHandler
  - FallbackHandler
  - RepeatHandler
  - FrustrationHandlerImpl
- Update tests
- Verify all tests pass

### **Deliverables:**
✅ Foundation is domain-agnostic  
✅ All domain code moved to McCarthy Artwork  
✅ Tests passing  
✅ No TypeScript errors  

---

## 🔀 **PHASE 4: AGENT ROUTING SYSTEM** 

**Goal:** Build agent routing and orchestration system  
**Status:** Not Started  
**Estimated Time:** 2-3 hours

**📌 REMINDER: BACKUP TO GITHUB AFTER COMPLETION!**

### **Tasks:**

#### **Task 4.1: Create AgentRouter** (1 hour)

**File:** `packages/worker/src/services/AgentRouter.ts`

```typescript
export class AgentRouter {
  private registry: AgentRegistry;
  private orchestrator: AgentOrchestrator;
  
  async routeToAgent(intent: Intent, context: Context): Promise<Response> {
    // Find capable agents
    const agents = this.registry.findCapableAgents(intent);
    
    if (agents.length === 0) {
      return this.handleNoAgentAvailable(intent);
    }
    
    if (agents.length === 1) {
      // Single agent handles it
      return await agents[0].handle(intent, context);
    }
    
    // Multiple agents - orchestrate collaboration
    return await this.orchestrator.collaborate(agents, intent, context);
  }
}
```

**Features:**
- Routes to appropriate McCarthy agent
- Handles "coming soon" agents
- Triggers multi-agent collaboration
- Falls back to foundation handlers

#### **Task 4.2: Create AgentRegistry** (45 min)

**File:** `packages/worker/src/services/AgentRegistry.ts`

```typescript
export class AgentRegistry {
  private agents: Map<string, McCarthyAgent> = new Map();
  
  registerAgent(agent: McCarthyAgent): void {
    this.agents.set(agent.type, agent);
  }
  
  getAgent(agentType: string): McCarthyAgent | null {
    return this.agents.get(agentType) || null;
  }
  
  findCapableAgents(intent: Intent): McCarthyAgent[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.canHandle(intent) || agent.canContribute(intent)
    );
  }
}
```

**Features:**
- Register McCarthy agents
- Find agents by capability
- Check agent availability
- List all agents

#### **Task 4.3: Create AgentOrchestrator** (1.5 hours)

**File:** `packages/worker/src/services/AgentOrchestrator.ts`

```typescript
export class AgentOrchestrator {
  async collaborate(
    agents: McCarthyAgent[],
    intent: Intent,
    context: Context
  ): Promise<Response> {
    const strategy = this.planCollaboration(agents, intent);
    
    switch (strategy.type) {
      case 'sequential':
        return await this.sequentialCollaboration(agents, intent, context);
      case 'parallel':
        return await this.parallelCollaboration(agents, intent, context);
      case 'hierarchical':
        return await this.hierarchicalCollaboration(agents, intent, context);
    }
  }
}
```

**Features:**
- Sequential collaboration (A asks B, then responds)
- Parallel collaboration (multiple agents work together)
- Hierarchical collaboration (manager coordinates workers)
- Intelligent strategy selection

#### **Task 4.4: Integrate into BaseAgent** (30 min)
- Add AgentRouter to BaseAgent
- Update message processing flow
- Route to McCarthy agents when appropriate
- Fall back to foundation handlers
- Update tests

#### **Task 4.5: Write Tests** (30 min)
- Test agent routing
- Test agent registration
- Test collaboration strategies
- Test fallback behavior

### **Deliverables:**
✅ Agent routing works  
✅ Multi-agent collaboration works  
✅ Foundation routes to McCarthy agents  
✅ Tests passing  

---

## 🛡️ **PHASE 5: CONSTRAINTS SYSTEM** 

**Goal:** Enforce business rules and prevent unauthorized actions  
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### **Tasks:**

#### **Task 5.1: Create ConstraintsValidator** (1.5 hours)

**File:** `packages/worker/src/services/ConstraintsValidator.ts`

```typescript
export class ConstraintsValidator {
  async validate(
    response: string,
    agent: McCarthyAgent,
    context: Context
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];
    
    // Check global constraints
    violations.push(...this.checkGlobalConstraints(response));
    
    // Check tenant constraints
    violations.push(...this.checkTenantConstraints(response, context.tenantId));
    
    // Check agent constraints
    violations.push(...this.checkAgentConstraints(response, agent));
    
    if (violations.length > 0) {
      return {
        passed: false,
        violations,
        action: 'regenerate',
        suggestedResponse: this.generateCompliantResponse(response, violations)
      };
    }
    
    return { passed: true };
  }
}
```

**Features:**
- Global constraints (all agents)
- Tenant constraints (business-specific)
- Agent constraints (agent-specific)
- Forbidden phrases/actions/commitments
- Required responses
- Escalation rules

#### **Task 5.2: Define Constraint Types** (30 min)

**File:** `packages/worker/src/types/constraints.ts`

```typescript
export interface AgentConstraints {
  forbiddenPhrases: string[];
  forbiddenActions: string[];
  forbiddenCommitments: string[];
  forbiddenTopics: string[];
  requiredResponses: ConditionalResponse[];
  escalationRules: EscalationRule[];
}
```

#### **Task 5.3: Create Global Constraints** (30 min)

**File:** `packages/worker/src/config/globalConstraints.ts`

```typescript
export const GLOBAL_CONSTRAINTS: AgentConstraints = {
  forbiddenPhrases: [
    "I'll get back to you later",
    "Let me transfer you",
    "I don't know",
    "That's not my department"
  ],
  forbiddenActions: [
    "offer_discount",
    "offer_refund",
    "change_pricing",
    "cancel_order"
  ],
  // ... more constraints
};
```

#### **Task 5.4: Integrate into BaseAgent** (30 min)
- Add ConstraintsValidator to message flow
- Validate after handler response
- Block or regenerate if violations found
- Log constraint violations
- Update tests

#### **Task 5.5: Write Tests** (30 min)
- Test global constraints
- Test tenant constraints
- Test agent constraints
- Test escalation rules
- Test regeneration

### **Deliverables:**
✅ Constraints enforced  
✅ Unauthorized actions blocked  
✅ Business rules protected  
✅ Tests passing  

---

## 🎨 **PHASE 6: McCARTHY ARTWORK ANALYZER** 

**Goal:** Build first specialized McCarthy agent  
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### **Tasks:**

#### **Task 6.1: Create McCarthyArtworkAgent Class** (1 hour)

**File:** `packages/mccarthy-artwork/src/McCarthyArtworkAgent.ts`

```typescript
import { BaseAgent } from '@agent-army/worker/BaseAgent';
import { CalculationEngine } from './components/CalculationEngine';
import { CalculationHandler } from './handlers/CalculationHandler';
import { HowToHandler } from './handlers/HowToHandler';
import { InformationHandler } from './handlers/InformationHandler';

export class McCarthyArtworkAgent extends BaseAgent {
  type = 'artwork_analyzer';
  name = 'McCarthy Artwork Analyzer';
  version = '1.0.0';
  
  private calculationEngine: CalculationEngine;
  
  constructor(config: AgentConfig) {
    super(config);
    
    // Add artwork-specific components
    this.calculationEngine = new CalculationEngine();
    
    // Register artwork-specific handlers
    this.registerHandler(new CalculationHandler(this.calculationEngine));
    this.registerHandler(new HowToHandler(this.ragEngine));
    this.registerHandler(new InformationHandler(this.ragEngine));
    
    // Load DTF knowledge base
    this.loadKnowledgeBase();
  }
  
  canHandle(intent: Intent): boolean {
    return ['calculation', 'howto', 'information'].includes(intent.type);
  }
  
  canContribute(intent: Intent): boolean {
    return intent.requiresArtworkKnowledge === true;
  }
}
```

**Features:**
- Extends BaseAgent (inherits all foundation)
- Adds CalculationEngine
- Registers artwork handlers
- Loads DTF knowledge base
- Defines capabilities

#### **Task 6.2: Configure Constraints** (30 min)

**File:** `packages/mccarthy-artwork/src/constraints.ts`

```typescript
export const ARTWORK_AGENT_CONSTRAINTS: AgentConstraints = {
  forbiddenActions: [
    'offer_discount',
    'offer_refund',
    'quote_pricing',
    'promise_delivery_date'
  ],
  requiredResponses: [
    {
      trigger: 'how much|price|cost',
      requiredResponse: 'I can help with technical artwork requirements. For pricing, let me connect you with our sales team.',
      cannotSay: ['it will cost', 'the price is']
    }
  ]
};
```

#### **Task 6.3: Load Knowledge Base** (30 min)
- Ingest DTF_Artwork_Requirements.md
- Ingest UV_DTF_Artwork_Requirements.md
- Ingest DPI_QUALITY_STANDARDS.md
- Create embeddings
- Store in D1 database

#### **Task 6.4: Write Tests** (1 hour)
- Test CalculationEngine accuracy
- Test handler responses
- Test RAG retrieval
- Test constraints enforcement
- Test conversation quality
- End-to-end conversation tests

### **Deliverables:**
✅ McCarthy Artwork functional  
✅ Calculation engine works  
✅ RAG knowledge loaded  
✅ Constraints enforced  
✅ Tests passing  

---

## 🧪 **PHASE 7: INTEGRATION & TESTING** 

**Goal:** Integrate everything and test thoroughly  
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### **Tasks:**

#### **Task 7.1: Register McCarthy Artwork** (30 min)

**File:** `packages/worker/src/index.ts`

```typescript
import { McCarthyArtworkAgent } from '@agent-army/mccarthy-artwork';

// Initialize registry
const registry = new AgentRegistry();

// Register McCarthy Artwork Analyzer
const artworkAgent = new McCarthyArtworkAgent({
  agentId: 'mccarthy-artwork',
  tenantId: context.tenantId,
  agentConfig: artworkAgentConfig,
  env: context.env
});

registry.registerAgent(artworkAgent);

// Initialize router with registry
const router = new AgentRouter(registry, orchestrator);

// Update BaseAgent to use router
baseAgent.setAgentRouter(router);
```

#### **Task 7.2: Test Routing** (30 min)
- Artwork questions → McCarthy Artwork
- General questions → Foundation handlers
- Multi-agent collaboration
- Fallback behavior

#### **Task 7.3: Test Constraints** (30 min)
- Verify forbidden phrases blocked
- Verify forbidden actions blocked
- Verify escalation rules work
- Verify required responses enforced

#### **Task 7.4: Test Conversation Quality** (30 min)
- Test empathy injection
- Test quality scoring
- Test hallucination prevention
- Test verbosity limits
- Test repetition detection

#### **Task 7.5: End-to-End Testing** (1 hour)
- Full conversation flows
- Multi-turn conversations
- Agent collaboration
- Error handling
- Edge cases

### **Deliverables:**
✅ All routing works  
✅ All constraints enforced  
✅ Conversation quality validated  
✅ All tests passing  
✅ Zero TypeScript errors  

---

## 🚀 **PHASE 8: DEPLOY & VALIDATE** 

**Goal:** Deploy to production and validate  
**Status:** Not Started  
**Estimated Time:** 1-2 hours

### **Tasks:**

#### **Task 8.1: Build & Deploy** (30 min)
```bash
# Build McCarthy Artwork package
cd packages/mccarthy-artwork
npm run build

# Build worker with new architecture
cd ../worker
npm run build

# Deploy to Cloudflare
npx wrangler deploy
```

#### **Task 8.2: Test on Production** (30 min)
```bash
# Test health endpoint
curl https://agent-army-worker.dartmouth.workers.dev/health

# Test artwork question (should route to McCarthy Artwork)
curl -X POST https://agent-army-worker.dartmouth.workers.dev/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What size can I print 4000x6000 at 300 DPI?"}'

# Test general question (should use foundation)
curl -X POST https://agent-army-worker.dartmouth.workers.dev/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'
```

#### **Task 8.3: Update Test Interface** (30 min)
- Deploy updated HTML to Cloudflare Pages
- Test conversation quality
- Test agent routing
- Test UI/UX

#### **Task 8.4: Validate & Monitor** (30 min)
- Check Cloudflare Analytics
- Monitor conversation quality scores
- Check error rates
- Validate performance metrics

### **Deliverables:**
✅ Deployed to production  
✅ All endpoints working  
✅ Test interface functional  
✅ Monitoring in place  
✅ Documentation updated  

---

## 📋 **CHECKLIST: FOUNDATION COMPLETE**

Foundation is complete when:
- [ ] Conversation Quality System built
- [ ] All handlers have Dartmouth personality
- [ ] Domain-specific code removed
- [ ] Agent routing system works
- [ ] Constraints system enforced
- [ ] All tests passing (97.9%+)
- [ ] Zero TypeScript errors
- [ ] Documentation complete

---

## 📋 **CHECKLIST: McCARTHY ARTWORK COMPLETE**

McCarthy Artwork is complete when:
- [ ] McCarthyArtworkAgent class built
- [ ] CalculationEngine integrated
- [ ] All handlers moved and working
- [ ] RAG knowledge base loaded
- [ ] Constraints configured
- [ ] Routes correctly from foundation
- [ ] Conversation quality validated
- [ ] All tests passing
- [ ] Deployed to production
- [ ] Test interface works

---

## 🎯 **SUCCESS CRITERIA**

### **Technical:**
- ✅ All tests passing (97.9%+)
- ✅ Zero TypeScript errors
- ✅ Conversation quality score 70+
- ✅ Response time <2 seconds
- ✅ Zero hallucinations
- ✅ Zero constraint violations

### **User Experience:**
- ✅ Responses feel personal and conversational
- ✅ Empathy appropriate to user sentiment
- ✅ Responses concise (under 200 words)
- ✅ Technical terms explained
- ✅ No repetition or loops
- ✅ Promises kept or not made

### **Business:**
- ✅ Constraints enforced
- ✅ No unauthorized actions
- ✅ Escalation rules work
- ✅ Multi-agent collaboration seamless
- ✅ Cost under $50/month
- ✅ Scalable to more agents

---

## 📊 **TIME ESTIMATES**

| Phase | Estimated Time | Status |
|-------|---------------|--------|
| Phase 1: Documentation | 2 hours | ✅ Complete |
| Phase 2: Conversation Quality | 3.5 hours | 🔄 80% |
| Phase 3: Foundation Refactor | 2-3 hours | Not Started |
| Phase 4: Agent Orchestration | 3-4 hours | Not Started |
| Phase 5: Constraints System | 2-3 hours | Not Started |
| Phase 6: McCarthy Artwork | 2-3 hours | Not Started |
| Phase 7: Integration & Testing | 2-3 hours | Not Started |
| Phase 8: Deploy & Validate | 1-2 hours | Not Started |
| **TOTAL** | **18-23 hours** | **35% Complete** |

**Time Spent:** ~8 hours  
**Time Remaining:** ~10-15 hours

---

## 🚀 **NEXT STEPS (IMMEDIATE)**

### **Right Now:**
1. ✅ Finish Phase 2 (30-45 min)
   - Update handlers with personality
   - Add conversation quality tests
   
2. ✅ Start Phase 3 (2-3 hours)
   - Create McCarthy Artwork package
   - Move domain-specific code
   - Update BaseAgent

### **This Session:**
- Complete Phase 2 & 3
- Start Phase 4 if time allows

### **Next Session:**
- Complete Phase 4, 5, 6
- Integration testing
- Deploy to production

---

**Last Updated:** November 18, 2025  
**Version:** 1.0.0  
**Status:** Foundation Build In Progress 🚀

