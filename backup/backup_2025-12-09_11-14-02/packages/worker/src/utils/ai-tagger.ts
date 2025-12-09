/**
 * AI Tagging System for McCarthy
 * Automatically categorizes and tags tickets based on content analysis
 */

export interface AITagSuggestions {
  // Product/Service categories
  productTags: string[];
  
  // Customer sentiment
  sentimentTags: string[];
  
  // Customer intent
  intentTags: string[];
  
  // Urgency level
  urgencyTags: string[];
  
  // Customer behavior/profile
  behaviorTags: string[];
  
  // Interests/passions detected
  interestTags: string[];
  
  // Pain points/fears
  painPointTags: string[];
  
  // Wants/needs
  needsTags: string[];
  
  // All tags combined
  allTags: string[];
}

/**
 * Generate AI tag suggestions for a ticket
 * This will be called by McCarthy AI when reviewing tickets
 */
export async function generateAITags(
  ticketContent: string,
  customerHistory?: any,
  aiProvider?: any
): Promise<AITagSuggestions> {
  // This is a placeholder for the actual AI integration
  // In production, this would call McCarthy AI's analysis endpoint
  
  const suggestions: AITagSuggestions = {
    productTags: [],
    sentimentTags: [],
    intentTags: [],
    urgencyTags: [],
    behaviorTags: [],
    interestTags: [],
    painPointTags: [],
    needsTags: [],
    allTags: []
  };

  // TODO: Integrate with McCarthy AI
  // For now, return basic keyword-based suggestions
  
  const content = ticketContent.toLowerCase();
  
  // Sentiment detection
  if (content.includes('angry') || content.includes('frustrated') || content.includes('terrible')) {
    suggestions.sentimentTags.push('Frustrated');
  } else if (content.includes('happy') || content.includes('great') || content.includes('excellent')) {
    suggestions.sentimentTags.push('Happy');
  } else if (content.includes('confused') || content.includes('unclear') || content.includes('don\'t understand')) {
    suggestions.sentimentTags.push('Confused');
  } else {
    suggestions.sentimentTags.push('Neutral');
  }
  
  // Intent detection
  if (content.includes('buy') || content.includes('purchase') || content.includes('order')) {
    suggestions.intentTags.push('Purchase Intent');
  } else if (content.includes('help') || content.includes('support') || content.includes('issue')) {
    suggestions.intentTags.push('Support Request');
  } else if (content.includes('complain') || content.includes('problem') || content.includes('broken')) {
    suggestions.intentTags.push('Complaint');
  } else if (content.includes('how') || content.includes('what') || content.includes('why')) {
    suggestions.intentTags.push('Question');
  } else if (content.includes('feedback') || content.includes('suggestion')) {
    suggestions.intentTags.push('Feedback');
  }
  
  // Urgency detection
  if (content.includes('urgent') || content.includes('asap') || content.includes('immediately')) {
    suggestions.urgencyTags.push('Urgent');
  } else if (content.includes('soon') || content.includes('quickly')) {
    suggestions.urgencyTags.push('High Priority');
  } else {
    suggestions.urgencyTags.push('Normal Priority');
  }
  
  // Product detection (examples)
  if (content.includes('premium') || content.includes('pro')) {
    suggestions.productTags.push('Premium Features');
  }
  if (content.includes('shipping') || content.includes('delivery')) {
    suggestions.productTags.push('Shipping');
  }
  if (content.includes('payment') || content.includes('billing')) {
    suggestions.productTags.push('Billing');
  }
  if (content.includes('account') || content.includes('login')) {
    suggestions.productTags.push('Account');
  }
  
  // Combine all tags
  suggestions.allTags = [
    ...suggestions.productTags,
    ...suggestions.sentimentTags,
    ...suggestions.intentTags,
    ...suggestions.urgencyTags,
    ...suggestions.behaviorTags,
    ...suggestions.interestTags,
    ...suggestions.painPointTags,
    ...suggestions.needsTags
  ];
  
  return suggestions;
}

/**
 * Format AI tag suggestions for storage
 */
export function formatAITagsForStorage(suggestions: AITagSuggestions): string {
  return suggestions.allTags.join(', ');
}

/**
 * McCarthy AI Prompt Template for Tag Generation
 * This will be used when calling McCarthy AI
 */
export const MCCARTHY_TAGGING_PROMPT = `
Analyze this customer ticket and generate comprehensive tags for:

1. **Product/Service**: What product or service is this about?
2. **Sentiment**: What is the customer's emotional state? (Happy, Frustrated, Angry, Confused, Neutral)
3. **Intent**: What does the customer want? (Purchase, Support, Complaint, Question, Feedback, Refund, Cancel)
4. **Urgency**: How urgent is this? (Critical, High, Normal, Low)
5. **Customer Behavior**: What type of customer? (First-time, Repeat, VIP, At-risk, Loyal)
6. **Interests/Passions**: What are they interested in based on the conversation?
7. **Pain Points/Fears**: What concerns or fears do they express?
8. **Wants/Needs**: What specific needs or desires are mentioned?

Return tags in this format: @tag {Category Name}

Example:
@tag {Product Issue}
@tag {Frustrated}
@tag {Support Request}
@tag {High Priority}
@tag {Repeat Customer}
@tag {Premium Features Interest}
@tag {Concerned about pricing}
@tag {Needs faster shipping}

Ticket Content:
{TICKET_CONTENT}

Customer History:
{CUSTOMER_HISTORY}

Generate tags:
`;

