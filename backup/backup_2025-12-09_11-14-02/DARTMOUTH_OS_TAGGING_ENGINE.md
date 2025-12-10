# Dartmouth OS - Universal Tagging Engine
## Platform-Level Intelligence System

**Version:** 1.0  
**Date:** December 8, 2025  
**Status:** 🚧 Core Infrastructure In Development  
**Scope:** **PLATFORM-LEVEL** - All Apps & AI Agents

---

## 🎯 **VISION**

The **Dartmouth OS Tagging Engine** is a **platform-level service** that provides universal tagging, customer intelligence, and behavioral analysis for **ALL applications and AI agents** in the Dartmouth OS ecosystem.

### **Core Principle:**
**One Tag System. Every App. Every AI Agent. Unified Intelligence.**

---

## 🏗️ **ARCHITECTURE**

### **Platform Stack:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DARTMOUTH OS CORE                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         UNIVERSAL TAGGING ENGINE (CORE SERVICE)         │    │
│  │                                                          │    │
│  │  • Tag Parser & Validator                               │    │
│  │  • Tag Storage (Multi-tenant)                           │    │
│  │  • Tag Search & Retrieval                               │    │
│  │  • Tag Analytics & Reporting                            │    │
│  │  • RFM Calculation Engine                               │    │
│  │  • AI Tag Suggestion Aggregator                         │    │
│  │  • Cross-System Tag Correlation                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                            ▲                                     │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                 │
│  ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐         │
│  │   AI AGENTS  │   │     APPS     │   │   FUTURE    │         │
│  │              │   │              │   │   SYSTEMS   │         │
│  │ • McCarthy   │   │ • Customer   │   │ • CRM       │         │
│  │ • FAM        │   │   Service    │   │ • Marketing │         │
│  │ • Sales      │   │ • Analytics  │   │ • Projects  │         │
│  │ • Marketing  │   │ • Knowledge  │   │ • etc.      │         │
│  └──────────────┘   └──────────────┘   └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **CORE COMPONENTS**

### **1. Tag Parser (Universal)**
```typescript
// Platform-level tag parsing
class DartmouthTagParser {
  /**
   * Parse @tag {keyword} syntax from any text
   * Works across ALL apps and agents
   */
  static parse(text: string): TagParseResult {
    const regex = /@tag\s*\{([^}]+)\}/gi;
    const tags: string[] = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      tags.push(match[1].trim());
    }
    
    return {
      tags,
      cleanedText: text.replace(regex, '').trim()
    };
  }
}
```

### **2. Tag Storage (Multi-tenant)**
```sql
-- Platform-level tag storage
CREATE TABLE dartmouth_tags (
  id TEXT PRIMARY KEY,
  tag_name TEXT NOT NULL,
  tag_category TEXT,  -- RFM, Sentiment, Product, etc.
  source_system TEXT,  -- customer-service, mccarthy-ai, fam-agent
  source_agent TEXT,   -- Which AI agent suggested it
  entity_type TEXT,    -- ticket, customer, order, artwork, etc.
  entity_id TEXT,
  confidence_score REAL,  -- AI confidence (0-1)
  reviewed_by TEXT,    -- Staff who reviewed
  reviewed_at TEXT,
  created_at TEXT,
  tenant_id TEXT       -- Multi-tenant support
);

-- Tag relationships (cross-system)
CREATE TABLE tag_relationships (
  id TEXT PRIMARY KEY,
  tag_id_1 TEXT,
  tag_id_2 TEXT,
  relationship_type TEXT,  -- correlates_with, implies, contradicts
  strength REAL,           -- 0-1
  created_at TEXT
);
```

### **3. RFM Engine (Platform-wide)**
```typescript
// Universal RFM calculation for ANY business model
class DartmouthRFMEngine {
  /**
   * Calculate RFM scores from ANY purchase/transaction data
   * Works for: eCommerce, SaaS, Services, B2B, etc.
   */
  static async calculate(params: {
    customerId: string;
    transactions: Transaction[];
    businessModel: 'ecommerce' | 'saas' | 'services' | 'b2b';
  }): Promise<RFMScore> {
    // Universal RFM calculation
    const recency = this.calculateRecency(params.transactions);
    const frequency = this.calculateFrequency(params.transactions);
    const monetary = this.calculateMonetary(params.transactions);
    
    return {
      r_score: this.scoreRecency(recency, params.businessModel),
      f_score: this.scoreFrequency(frequency, params.businessModel),
      m_score: this.scoreMonetary(monetary, params.businessModel),
      segment: this.determineSegment(r, f, m),
      tags: this.generateRFMTags(r, f, m)
    };
  }
}
```

### **4. AI Tag Aggregator**
```typescript
// Collect and merge tags from ALL AI agents
class DartmouthAITagAggregator {
  /**
   * Aggregate tag suggestions from multiple AI agents
   * Resolve conflicts, calculate confidence
   */
  static async aggregate(suggestions: AITagSuggestion[]): Promise<AggregatedTags> {
    // McCarthy AI suggests: @tag {Frustrated}
    // FAM Agent suggests: @tag {Complex Design}
    // Sales Agent suggests: @tag {Hot Lead}
    
    // Merge, deduplicate, resolve conflicts
    const merged = this.mergeSuggestions(suggestions);
    const resolved = this.resolveConflicts(merged);
    const confident = this.filterByConfidence(resolved, 0.7);
    
    return {
      tags: confident,
      confidence_avg: this.averageConfidence(confident),
      sources: suggestions.map(s => s.agent_name)
    };
  }
}
```

---

## 🤖 **AI AGENT INTEGRATION**

### **Standard AI Agent Interface:**

```typescript
// ALL AI agents implement this interface
interface DartmouthAIAgent {
  name: string;
  version: string;
  
  /**
   * Suggest tags for any entity
   */
  suggestTags(context: TagContext): Promise<TagSuggestion[]>;
  
  /**
   * Validate/review existing tags
   */
  reviewTags(tags: string[], context: TagContext): Promise<TagReview>;
  
  /**
   * Learn from human feedback
   */
  learnFromFeedback(feedback: TagFeedback): Promise<void>;
}
```

### **Example: McCarthy AI**
```typescript
class McCarthyAI implements DartmouthAIAgent {
  name = 'McCarthy AI';
  version = '2.0';
  
  async suggestTags(context: TagContext): Promise<TagSuggestion[]> {
    // Analyze customer ticket
    const sentiment = await this.analyzeSentiment(context.content);
    const intent = await this.detectIntent(context.content);
    const rfm = await DartmouthRFMEngine.calculate({
      customerId: context.customer_id,
      transactions: context.purchase_history,
      businessModel: 'ecommerce'
    });
    
    return [
      { tag: `@tag {${sentiment}}`, confidence: 0.95, category: 'sentiment' },
      { tag: `@tag {${intent}}`, confidence: 0.88, category: 'intent' },
      ...rfm.tags.map(t => ({ tag: t, confidence: 1.0, category: 'rfm' }))
    ];
  }
}
```

### **Example: FAM Agent (Future)**
```typescript
class FAMAgent implements DartmouthAIAgent {
  name = 'FAM Agent';
  version = '1.0';
  
  async suggestTags(context: TagContext): Promise<TagSuggestion[]> {
    // Analyze artwork file
    const complexity = await this.analyzeComplexity(context.artwork_file);
    const colors = await this.detectColors(context.artwork_file);
    const quality = await this.assessQuality(context.artwork_file);
    
    return [
      { tag: `@tag {${complexity}}`, confidence: 0.92, category: 'artwork' },
      { tag: `@tag {${colors.count} Colors}`, confidence: 1.0, category: 'artwork' },
      { tag: `@tag {Quality: ${quality}}`, confidence: 0.85, category: 'artwork' }
    ];
  }
}
```

---

## 📊 **CROSS-SYSTEM TAG CORRELATION**

### **Example: VIP Customer Journey**

```typescript
// Customer tagged across multiple systems
const customer = {
  id: 'CUST-12345',
  name: 'Sarah Johnson'
};

// 1. Customer Service tags (McCarthy AI)
await DartmouthOS.TagEngine.tag({
  entity: customer,
  tags: [
    '@tag {VIP - Top 1%}',
    '@tag {Active Buyer}',
    '@tag {High AOV $15,000+}'
  ],
  source: 'mccarthy-ai',
  context: 'support-ticket'
});

// 2. Sales Agent detects opportunity
await DartmouthOS.TagEngine.tag({
  entity: customer,
  tags: [
    '@tag {Upsell Ready}',
    '@tag {Enterprise Interest}'
  ],
  source: 'sales-agent',
  context: 'lead-qualification'
});

// 3. FAM Agent analyzes artwork request
await DartmouthOS.TagEngine.tag({
  entity: customer,
  tags: [
    '@tag {Complex Design Preference}',
    '@tag {Premium Quality}'
  ],
  source: 'fam-agent',
  context: 'artwork-analysis'
});

// 4. Marketing Agent creates segment
await DartmouthOS.TagEngine.tag({
  entity: customer,
  tags: [
    '@tag {VIP Campaign}',
    '@tag {Exclusive Offers}'
  ],
  source: 'marketing-agent',
  context: 'campaign-segmentation'
});

// 5. Query unified customer intelligence
const intelligence = await DartmouthOS.TagEngine.getIntelligence(customer.id);
/*
Returns:
{
  customer_id: 'CUST-12345',
  all_tags: [
    '@tag {VIP - Top 1%}',
    '@tag {Active Buyer}',
    '@tag {High AOV $15,000+}',
    '@tag {Upsell Ready}',
    '@tag {Enterprise Interest}',
    '@tag {Complex Design Preference}',
    '@tag {Premium Quality}',
    '@tag {VIP Campaign}',
    '@tag {Exclusive Offers}'
  ],
  tag_sources: {
    'mccarthy-ai': 3,
    'sales-agent': 2,
    'fam-agent': 2,
    'marketing-agent': 2
  },
  confidence_avg: 0.91,
  last_updated: '2025-12-08T23:00:00Z'
}
*/
```

---

## 🔌 **API ENDPOINTS (Platform-Level)**

### **Core Tag API:**
```
GET    /api/dartmouth-os/tags
GET    /api/dartmouth-os/tags/:id
POST   /api/dartmouth-os/tags
PUT    /api/dartmouth-os/tags/:id
DELETE /api/dartmouth-os/tags/:id

GET    /api/dartmouth-os/tags/search?query=VIP&source=mccarthy-ai
GET    /api/dartmouth-os/tags/analytics
GET    /api/dartmouth-os/tags/correlations
```

### **AI Agent API:**
```
POST   /api/dartmouth-os/ai/suggest-tags
POST   /api/dartmouth-os/ai/review-tags
POST   /api/dartmouth-os/ai/learn-feedback
GET    /api/dartmouth-os/ai/agents
```

### **RFM API:**
```
GET    /api/dartmouth-os/rfm/calculate/:customer_id
GET    /api/dartmouth-os/rfm/segments
GET    /api/dartmouth-os/rfm/analytics
```

### **Intelligence API:**
```
GET    /api/dartmouth-os/intelligence/:entity_id
GET    /api/dartmouth-os/intelligence/search
POST   /api/dartmouth-os/intelligence/correlate
```

---

## 🎯 **USE CASES ACROSS SYSTEMS**

### **1. Customer Service (Current)**
- Auto-tag support tickets
- RFM-based prioritization
- Sentiment analysis
- Churn prediction

### **2. Sales (Future)**
- Lead qualification
- Opportunity scoring
- Deal prioritization
- Upsell identification

### **3. Marketing (Future)**
- Campaign segmentation
- Personalization
- A/B testing groups
- ROI attribution

### **4. Product (Future)**
- Feature request tagging
- Bug categorization
- User feedback analysis
- Roadmap prioritization

### **5. Operations (Future)**
- Task categorization
- Resource allocation
- Performance tracking
- Process optimization

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Phase 1: Core Infrastructure** (Current - Week 1)
- ✅ Tag parser utility
- ✅ Basic tag storage
- ✅ Tag search API
- 🚧 Tag display in Customer Service
- 🚧 @Memos integration

### **Phase 2: McCarthy AI Integration** (Week 2)
- RFM calculation engine
- Sentiment analysis
- Intent detection
- Auto-tagging workflow
- Staff review interface

### **Phase 3: Platform Services** (Week 3-4)
- Multi-tenant tag storage
- AI agent aggregator
- Cross-system correlation
- Analytics dashboard
- API documentation

### **Phase 4: Additional AI Agents** (Month 2)
- FAM Agent integration
- Sales Agent (if built)
- Marketing Agent (if built)
- Custom agent framework

### **Phase 5: Advanced Features** (Month 3+)
- Predictive analytics
- Machine learning improvements
- Custom tag taxonomies
- Workflow automation
- Enterprise features

---

## 📈 **SUCCESS METRICS (Platform-Wide)**

### **Adoption Metrics:**
- Number of apps using tagging
- Number of AI agents integrated
- Tags created per day
- Tag accuracy rate

### **Business Metrics:**
- Revenue impact by tag
- Customer retention by segment
- Marketing ROI by tag
- Operational efficiency gains

### **Technical Metrics:**
- API response time (<100ms)
- Tag suggestion accuracy (>90%)
- System uptime (99.9%+)
- Cross-system correlation accuracy

---

## 🔒 **SECURITY & PRIVACY**

### **Multi-Tenant Isolation:**
- Tags isolated by tenant_id
- No cross-tenant tag visibility
- Encrypted at rest
- Audit logging

### **AI Agent Security:**
- API key authentication
- Rate limiting
- Confidence thresholds
- Human review for critical tags

### **Data Privacy:**
- GDPR compliant
- Data retention policies
- Right to be forgotten
- Anonymization options

---

## ✅ **CONCLUSION**

The **Dartmouth OS Tagging Engine** is a **platform-level intelligence system** that provides:

1. **Universal tagging** across all apps and agents
2. **AI-powered automation** (70% automated)
3. **Cross-system intelligence** (unified customer view)
4. **Scalable architecture** (multi-tenant, high-performance)
5. **Future-proof design** (extensible for any app/agent)

**This is NOT just for Customer Service. This is Dartmouth OS CORE infrastructure that will power ALL future applications and AI agents.**

---

*Version 1.0 - December 8, 2025*

