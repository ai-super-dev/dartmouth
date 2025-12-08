# Advanced Tagging System Architecture
## Dartmouth OS Customer Service Platform

## Overview
The Advanced Tagging System combines **manual staff tagging** with **McCarthy AI auto-tagging** to create a comprehensive customer intelligence platform. This enables RFM (Recency, Frequency, Monetary) analysis, behavioral segmentation, and personalized customer experiences.

---

## Tag Syntax

### Manual Tagging by Staff
Staff can add tags anywhere using the syntax: `@tag {keyword}`

**Examples:**
- `@tag {James Scott}` - Person name
- `@tag {Product Issue}` - Category
- `@tag {Urgent}` - Priority
- `@tag {Follow up tomorrow}` - Action item

**Where Staff Can Tag:**
- ✅ @Memos (Personal notes)
- ✅ Group Chat messages
- ✅ Ticket replies
- ✅ Staff notes (internal)
- ✅ Live Chat conversations

---

## McCarthy AI Auto-Tagging

### 1. **Product/Service Tags**
What the customer is asking about:
- `@tag {Shipping}`, `@tag {Billing}`, `@tag {Account}`, `@tag {Premium Features}`
- `@tag {Product A}`, `@tag {Product B}`, `@tag {Service X}`

### 2. **Sentiment Tags**
Customer emotional state:
- `@tag {Happy}` - Positive, satisfied
- `@tag {Frustrated}` - Annoyed, impatient
- `@tag {Angry}` - Very upset, demanding
- `@tag {Confused}` - Unclear, needs guidance
- `@tag {Neutral}` - Factual, no emotion

### 3. **Intent Tags**
What the customer wants:
- `@tag {Purchase Intent}` - Ready to buy
- `@tag {Support Request}` - Needs help
- `@tag {Complaint}` - Problem with product/service
- `@tag {Question}` - Seeking information
- `@tag {Feedback}` - Providing suggestions
- `@tag {Refund Request}` - Wants money back
- `@tag {Cancel Request}` - Wants to cancel

### 4. **Urgency Tags**
How urgent is this?
- `@tag {Critical}` - Business-stopping issue
- `@tag {High Priority}` - Needs quick response
- `@tag {Normal Priority}` - Standard timeline
- `@tag {Low Priority}` - Can wait

---

## RFM Model Integration

### **Recency Tags** (When was last purchase?)
- `@tag {Active Buyer}` - Purchased in last 30 days
- `@tag {Recent Buyer}` - Purchased 31-60 days ago
- `@tag {At-Risk}` - Purchased 61-90 days ago
- `@tag {Churned}` - No purchase in 90+ days
- `@tag {Dormant}` - No purchase in 180+ days

### **Frequency Tags** (How often do they buy?)
- `@tag {First Purchase}` - Brand new customer (1 order)
- `@tag {Occasional Buyer}` - 2-3 orders
- `@tag {Repeat Buyer}` - 4-6 orders
- `@tag {Frequent Buyer}` - 7-12 orders
- `@tag {Loyal Customer}` - 13+ orders
- `@tag {Monthly Buyer}` - Purchases every month
- `@tag {Quarterly Buyer}` - Purchases every 3 months
- `@tag {Seasonal Buyer}` - Only certain times of year

### **Monetary Tags** (How much do they spend?)
- `@tag {VIP - Top 1%}` - Highest lifetime value
- `@tag {High Value}` - Top 10% of spenders
- `@tag {Medium Value}` - Middle 40%
- `@tag {Low Value}` - Bottom 50%
- `@tag {Whale}` - Single very large purchase
- `@tag {High AOV $500+}` - Average order value $500+
- `@tag {Medium AOV $100-499}`
- `@tag {Low AOV <$100}`
- `@tag {Consistent Spender}` - Regular medium purchases

### **Combined RFM Segments**
- `@tag {Champions}` - High R, F, M (Best customers)
- `@tag {Loyal}` - High F, M (Frequent, valuable)
- `@tag {Potential Loyalist}` - Recent, frequent, growing spend
- `@tag {New Customers}` - High R, low F (Just started)
- `@tag {Promising}` - Recent, good spend, low frequency
- `@tag {Need Attention}` - Above average R, F, M but declining
- `@tag {About to Sleep}` - Below average R, F, M
- `@tag {Cannot Lose}` - High M, low R (Valuable but inactive)
- `@tag {Hibernating}` - Low R, F, M (Lost customers)

---

## Behavioral & Psychographic Tags

### **Customer Behavior**
- `@tag {Early Adopter}` - Buys new releases first
- `@tag {Price Shopper}` - Compares prices, waits for sales
- `@tag {Promo Sensitive}` - Only buys on discount
- `@tag {Brand Loyal}` - Sticks with brand
- `@tag {Cross-Category Buyer}` - Purchases diverse products
- `@tag {Single Category}` - Only buys one type
- `@tag {Bundle Buyer}` - Purchases multiple items
- `@tag {Impulse Buyer}` - Quick purchase decisions

### **Engagement Level**
- `@tag {Highly Engaged}` - Frequent contact, opens emails
- `@tag {Moderately Engaged}` - Occasional interaction
- `@tag {Low Engagement}` - Rarely contacts
- `@tag {Email Responsive}` - Opens and clicks emails
- `@tag {Email Ignorer}` - Never opens emails
- `@tag {Support Heavy}` - Many support tickets
- `@tag {Self-Service}` - Rarely needs help
- `@tag {Community Active}` - Participates in forums

### **Interests & Passions** (Detected from conversations)
- `@tag {Fitness Enthusiast}`
- `@tag {Tech Savvy}`
- `@tag {Eco-Conscious}`
- `@tag {Budget Conscious}`
- `@tag {Luxury Seeker}`
- `@tag {Health Focused}`
- `@tag {Family Oriented}`
- `@tag {Professional}`

### **Pain Points & Fears**
- `@tag {Concerned about pricing}`
- `@tag {Worried about quality}`
- `@tag {Shipping anxiety}`
- `@tag {Return policy concerns}`
- `@tag {Privacy concerns}`
- `@tag {Trust issues}`
- `@tag {Time-sensitive needs}`

### **Wants & Needs**
- `@tag {Needs faster shipping}`
- `@tag {Wants premium features}`
- `@tag {Seeks customization}`
- `@tag {Needs bulk discounts}`
- `@tag {Wants subscription}`
- `@tag {Needs better support}`

---

## Use Cases

### 1. **Ticket Prioritization**
- VIP and High Value customers get priority routing
- At-Risk customers get immediate attention
- Champions get white-glove service

### 2. **Personalized Responses**
- Tailor tone based on sentiment tags
- Reference purchase history for context
- Offer relevant upsells based on behavior

### 3. **Proactive Outreach**
- Contact "At-Risk" customers before they churn
- Reward "Champions" with exclusive offers
- Re-engage "Hibernating" customers

### 4. **Marketing Segmentation**
- Email campaigns to "Promo Sensitive" customers
- Premium product launches to "Early Adopters"
- Loyalty programs for "Frequent Buyers"

### 5. **Analytics & Reporting**
- Track sentiment trends over time
- Measure support load by customer segment
- Calculate ROI by RFM segment
- Identify common pain points by product

### 6. **Churn Prediction**
- Monitor "At-Risk" tag assignments
- Alert when "Champions" become "Need Attention"
- Track "Churned" customers for win-back campaigns

### 7. **LTV (Lifetime Value) Optimization**
- Identify high-potential customers early
- Nurture "Promising" customers to "Champions"
- Prevent "Cannot Lose" customers from churning

---

## Tag Management

### **Tags Page** (`/tags`)
- View all tags with usage counts
- Click tag to see all tagged content
- Search within tagged items
- Navigate through search results (prev/next)

### **Search Functionality**
- Text search: "James Scott" finds all mentions
- Tag search: Click any tag to filter
- Combined search: Filter by tag + text
- Result count and navigation

### **Tag Display**
- Tags shown as blue pills with # icon
- Clickable to navigate to Tags page
- Visible on:
  - @Memos posts
  - Group Chat messages
  - Ticket details
  - Staff notes
  - Live Chat transcripts

---

## Database Schema

### **Tables with Tags:**
```sql
-- Tickets
ALTER TABLE tickets ADD COLUMN tags TEXT;
ALTER TABLE tickets ADD COLUMN ai_suggested_tags TEXT;
ALTER TABLE tickets ADD COLUMN tags_reviewed_by TEXT;
ALTER TABLE tickets ADD COLUMN tags_reviewed_at TEXT;

-- Group Chat Messages
ALTER TABLE group_chat_messages ADD COLUMN tags TEXT;

-- Staff Memos
ALTER TABLE staff_memos ADD COLUMN tags TEXT;

-- Internal Notes
ALTER TABLE internal_notes ADD COLUMN tags TEXT;

-- Chat Messages
ALTER TABLE chat_messages ADD COLUMN tags TEXT;
```

### **Tag Storage Format:**
Tags are stored as comma-separated strings:
```
"Product Issue, Frustrated, High Priority, VIP - Top 1%"
```

---

## McCarthy AI Integration

### **When McCarthy Reviews a Ticket:**
1. Analyze ticket content + customer history
2. Generate comprehensive tags across all categories
3. Store in `ai_suggested_tags` field
4. Staff can review and approve/edit
5. Final tags stored in `tags` field

### **AI Tagging Prompt:**
```
Analyze this customer ticket and their purchase history:

Customer: John Smith
Total Orders: 15
Total Spent: $4,523
Last Purchase: 12 days ago
Average Order Value: $301
Purchase Frequency: Every 3 weeks

Ticket Content: "I'm frustrated that my premium subscription isn't working..."

Generate tags for:
1. Product/Service
2. Sentiment
3. Intent
4. Urgency
5. RFM Segment
6. Behavior
7. Interests
8. Pain Points
9. Wants/Needs

Return tags in @tag {keyword} format.
```

### **AI Response:**
```
@tag {Premium Subscription}
@tag {Frustrated}
@tag {Support Request}
@tag {High Priority}
@tag {Loyal Customer}
@tag {High Value}
@tag {Active Buyer}
@tag {Frequent Buyer}
@tag {High AOV $500+}
@tag {Tech Savvy}
@tag {Needs immediate resolution}
```

---

## Future Enhancements

### **Phase 2:**
- [ ] Tag-based workflows (auto-assign based on tags)
- [ ] Tag-based SLA rules (VIP gets faster response)
- [ ] Tag-based canned responses
- [ ] Tag analytics dashboard
- [ ] Tag trend visualization
- [ ] Predictive tagging (suggest tags as staff types)

### **Phase 3:**
- [ ] Customer 360 view with all tags
- [ ] Tag-based customer journey mapping
- [ ] Integration with marketing automation
- [ ] Tag-based A/B testing
- [ ] Machine learning tag suggestions
- [ ] Custom tag taxonomies per business

---

## Benefits

### **For Staff:**
- ✅ Faster ticket categorization
- ✅ Better context on customer value
- ✅ Personalized response suggestions
- ✅ Easy knowledge sharing via tags

### **For Managers:**
- ✅ Real-time customer segmentation
- ✅ Trend analysis and reporting
- ✅ Performance metrics by segment
- ✅ Churn prediction and prevention

### **For Marketing:**
- ✅ Precise targeting for campaigns
- ✅ Behavioral segmentation
- ✅ RFM-based personalization
- ✅ Customer lifetime value optimization

### **For Business:**
- ✅ Increased customer retention
- ✅ Higher average order value
- ✅ Improved customer satisfaction
- ✅ Data-driven decision making
- ✅ Competitive advantage through personalization

---

## Implementation Status

✅ **Completed:**
- Tag syntax parser (`@tag {keyword}`)
- Backend tag storage and retrieval
- Tags API endpoints
- Tags page with search
- @Memos tag display
- Group Chat tag parsing
- Database migrations

🚧 **In Progress:**
- Group Chat tag display
- McCarthy AI integration
- Ticket tag UI

📋 **Pending:**
- Staff notes tag support
- Live Chat tag support
- Tag analytics dashboard
- RFM calculation engine
- Automated tag workflows

---

*Last Updated: December 8, 2025*

