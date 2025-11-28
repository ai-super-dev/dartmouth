/**
 * Ticket Manager
 * 
 * Manages customer service tickets:
 * - Create/read/update/delete tickets
 * - Priority detection (VIP, angry customers, refunds → HIGH)
 * - Category classification (order status, quote, production, artwork, etc.)
 * - Assignment engine (auto-assign to best available staff)
 * - SLA tracking (response time, resolution time)
 * 
 * Created: Nov 28, 2025
 * Part of: Customer Service Agent Core
 */

import type { NormalizedMessage, ChannelType } from './OmnichannelRouter';

/**
 * Ticket status
 */
export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';

/**
 * Ticket priority
 */
export type TicketPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Ticket category
 */
export type TicketCategory =
  | 'order_status'
  | 'quote_request'
  | 'production_status'
  | 'artwork_issue'
  | 'shipping'
  | 'refund'
  | 'complaint'
  | 'product_inquiry'
  | 'technical_support'
  | 'other';

/**
 * Ticket
 */
export interface Ticket {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  channelType: ChannelType;
  assignedTo?: string;  // Staff user ID
  assignedAt?: string;
  messages: TicketMessage[];
  tags: string[];
  isVIP: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'angry';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  sla: {
    firstResponseDue: string;
    resolutionDue: string;
    firstResponseAt?: string;
    firstResponseSLAMet?: boolean;
    resolutionSLAMet?: boolean;
  };
  metadata?: Record<string, any>;
}

/**
 * Ticket message
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName?: string;
  content: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    name?: string;
  }>;
  isInternal: boolean;  // Internal note (not visible to customer)
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * Ticket assignment
 */
export interface TicketAssignment {
  ticketId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
}

/**
 * Ticket filter options
 */
export interface TicketFilterOptions {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: string;
  customerId?: string;
  channelType?: ChannelType[];
  isVIP?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * Ticket statistics
 */
export interface TicketStatistics {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  byChannel: Record<ChannelType, number>;
  averageResponseTime: number;  // milliseconds
  averageResolutionTime: number;  // milliseconds
  slaCompliance: {
    firstResponse: number;  // percentage
    resolution: number;     // percentage
  };
}

/**
 * Ticket Manager
 * 
 * Manages all customer service tickets.
 */
export class TicketManager {
  private tickets: Map<string, Ticket> = new Map();
  private customerTickets: Map<string, string[]> = new Map(); // customerId -> ticketIds
  private staffTickets: Map<string, string[]> = new Map(); // staffId -> ticketIds

  // SLA times (in milliseconds)
  private slaConfig = {
    firstResponse: {
      critical: 15 * 60 * 1000,  // 15 minutes
      high: 1 * 60 * 60 * 1000,  // 1 hour
      normal: 4 * 60 * 60 * 1000,  // 4 hours
      low: 24 * 60 * 60 * 1000   // 24 hours
    },
    resolution: {
      critical: 4 * 60 * 60 * 1000,   // 4 hours
      high: 24 * 60 * 60 * 1000,      // 24 hours
      normal: 72 * 60 * 60 * 1000,    // 72 hours
      low: 168 * 60 * 60 * 1000       // 7 days
    }
  };

  constructor() {
    console.log('[TicketManager] Initialized');
  }

  /**
   * Create a new ticket from a message
   */
  async createTicket(message: NormalizedMessage, options?: {
    subject?: string;
    isVIP?: boolean;
    metadata?: Record<string, any>;
  }): Promise<Ticket> {
    const ticketId = this.generateTicketId();
    const now = new Date().toISOString();

    // Detect priority
    const priority = this.detectPriority(message.content, options?.isVIP || false);

    // Detect category
    const category = this.detectCategory(message.content);

    // Detect sentiment
    const sentiment = this.detectSentiment(message.content);

    // Calculate SLA times
    const firstResponseDue = new Date(Date.now() + this.slaConfig.firstResponse[priority]).toISOString();
    const resolutionDue = new Date(Date.now() + this.slaConfig.resolution[priority]).toISOString();

    // Create ticket
    const ticket: Ticket = {
      id: ticketId,
      customerId: message.customerId,
      customerName: message.customerName,
      customerEmail: message.customerEmail,
      customerPhone: message.customerPhone,
      subject: options?.subject || this.generateSubject(message.content, category),
      description: message.content,
      status: 'new',
      priority,
      category,
      channelType: message.channelType,
      messages: [{
        id: this.generateMessageId(),
        ticketId,
        senderId: message.customerId,
        senderType: 'customer',
        senderName: message.customerName,
        content: message.content,
        attachments: message.attachments,
        isInternal: false,
        createdAt: message.metadata.timestamp,
        metadata: message.metadata
      }],
      tags: [],
      isVIP: options?.isVIP || false,
      sentiment,
      createdAt: now,
      updatedAt: now,
      sla: {
        firstResponseDue,
        resolutionDue
      },
      metadata: options?.metadata
    };

    // Store ticket
    this.tickets.set(ticketId, ticket);

    // Index by customer
    const customerTicketIds = this.customerTickets.get(message.customerId) || [];
    customerTicketIds.push(ticketId);
    this.customerTickets.set(message.customerId, customerTicketIds);

    console.log(`[TicketManager] ✅ Ticket created: ${ticketId} (${priority} priority, ${category})`);

    return ticket;
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): Ticket | null {
    return this.tickets.get(ticketId) || null;
  }

  /**
   * Get tickets for customer
   */
  getCustomerTickets(customerId: string): Ticket[] {
    const ticketIds = this.customerTickets.get(customerId) || [];
    return ticketIds
      .map(id => this.tickets.get(id))
      .filter(t => t !== undefined) as Ticket[];
  }

  /**
   * Get tickets assigned to staff
   */
  getStaffTickets(staffId: string): Ticket[] {
    const ticketIds = this.staffTickets.get(staffId) || [];
    return ticketIds
      .map(id => this.tickets.get(id))
      .filter(t => t !== undefined) as Ticket[];
  }

  /**
   * Get all tickets (with optional filters)
   */
  getTickets(filters?: TicketFilterOptions): Ticket[] {
    let tickets = Array.from(this.tickets.values());

    if (!filters) return tickets;

    // Apply filters
    if (filters.status) {
      tickets = tickets.filter(t => filters.status!.includes(t.status));
    }

    if (filters.priority) {
      tickets = tickets.filter(t => filters.priority!.includes(t.priority));
    }

    if (filters.category) {
      tickets = tickets.filter(t => filters.category!.includes(t.category));
    }

    if (filters.assignedTo) {
      tickets = tickets.filter(t => t.assignedTo === filters.assignedTo);
    }

    if (filters.customerId) {
      tickets = tickets.filter(t => t.customerId === filters.customerId);
    }

    if (filters.channelType) {
      tickets = tickets.filter(t => filters.channelType!.includes(t.channelType));
    }

    if (filters.isVIP !== undefined) {
      tickets = tickets.filter(t => t.isVIP === filters.isVIP);
    }

    if (filters.createdAfter) {
      tickets = tickets.filter(t => t.createdAt >= filters.createdAfter!);
    }

    if (filters.createdBefore) {
      tickets = tickets.filter(t => t.createdAt <= filters.createdBefore!);
    }

    return tickets;
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: string,
    senderId: string,
    senderType: 'customer' | 'agent' | 'system',
    content: string,
    options?: {
      senderName?: string;
      attachments?: TicketMessage['attachments'];
      isInternal?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<TicketMessage> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const message: TicketMessage = {
      id: this.generateMessageId(),
      ticketId,
      senderId,
      senderType,
      senderName: options?.senderName,
      content,
      attachments: options?.attachments,
      isInternal: options?.isInternal || false,
      createdAt: new Date().toISOString(),
      metadata: options?.metadata
    };

    ticket.messages.push(message);
    ticket.updatedAt = new Date().toISOString();

    // Update first response SLA if this is the first agent response
    if (senderType === 'agent' && !ticket.sla.firstResponseAt) {
      ticket.sla.firstResponseAt = message.createdAt;
      ticket.sla.firstResponseSLAMet = new Date(message.createdAt) <= new Date(ticket.sla.firstResponseDue);
    }

    console.log(`[TicketManager] ✅ Message added to ticket ${ticketId}`);

    return message;
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    // Track resolution/closure times
    if (status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date().toISOString();
      ticket.sla.resolutionSLAMet = new Date(ticket.resolvedAt) <= new Date(ticket.sla.resolutionDue);
    }

    if (status === 'closed' && !ticket.closedAt) {
      ticket.closedAt = new Date().toISOString();
    }

    console.log(`[TicketManager] ✅ Ticket ${ticketId} status: ${oldStatus} → ${status}`);

    return true;
  }

  /**
   * Update ticket priority
   */
  async updatePriority(ticketId: string, priority: TicketPriority): Promise<boolean> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    const oldPriority = ticket.priority;
    ticket.priority = priority;
    ticket.updatedAt = new Date().toISOString();

    // Recalculate SLA times
    const createdTime = new Date(ticket.createdAt).getTime();
    ticket.sla.firstResponseDue = new Date(createdTime + this.slaConfig.firstResponse[priority]).toISOString();
    ticket.sla.resolutionDue = new Date(createdTime + this.slaConfig.resolution[priority]).toISOString();

    console.log(`[TicketManager] ✅ Ticket ${ticketId} priority: ${oldPriority} → ${priority}`);

    return true;
  }

  /**
   * Assign ticket to staff
   */
  async assignTicket(ticketId: string, staffId: string, assignedBy: string, reason?: string): Promise<boolean> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    // Remove from previous staff's list
    if (ticket.assignedTo) {
      const prevStaffTickets = this.staffTickets.get(ticket.assignedTo) || [];
      this.staffTickets.set(
        ticket.assignedTo,
        prevStaffTickets.filter(id => id !== ticketId)
      );
    }

    // Assign to new staff
    ticket.assignedTo = staffId;
    ticket.assignedAt = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();

    // Update status if it's new
    if (ticket.status === 'new') {
      ticket.status = 'open';
    }

    // Add to staff's list
    const staffTicketIds = this.staffTickets.get(staffId) || [];
    staffTicketIds.push(ticketId);
    this.staffTickets.set(staffId, staffTicketIds);

    console.log(`[TicketManager] ✅ Ticket ${ticketId} assigned to ${staffId}`);

    return true;
  }

  /**
   * Auto-assign ticket to best available staff
   */
  async autoAssignTicket(ticketId: string, availableStaff: string[]): Promise<string | null> {
    if (availableStaff.length === 0) return null;

    const ticket = this.tickets.get(ticketId);
    if (!ticket) return null;

    // Simple round-robin assignment
    // In production, consider: workload, expertise, availability, performance
    const staffWorkloads = availableStaff.map(staffId => ({
      staffId,
      workload: (this.staffTickets.get(staffId) || []).length
    }));

    // Sort by workload (ascending)
    staffWorkloads.sort((a, b) => a.workload - b.workload);

    const selectedStaff = staffWorkloads[0].staffId;

    await this.assignTicket(ticketId, selectedStaff, 'system', 'Auto-assigned based on workload');

    return selectedStaff;
  }

  /**
   * Add tags to ticket
   */
  async addTags(ticketId: string, tags: string[]): Promise<boolean> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    for (const tag of tags) {
      if (!ticket.tags.includes(tag)) {
        ticket.tags.push(tag);
      }
    }

    ticket.updatedAt = new Date().toISOString();

    console.log(`[TicketManager] ✅ Tags added to ticket ${ticketId}: ${tags.join(', ')}`);

    return true;
  }

  /**
   * Get ticket statistics
   */
  getStatistics(): TicketStatistics {
    const tickets = Array.from(this.tickets.values());

    // Count by status
    const byStatus: Record<TicketStatus, number> = {
      new: 0,
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0
    };

    // Count by priority
    const byPriority: Record<TicketPriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
      critical: 0
    };

    // Count by category
    const byCategory: Record<TicketCategory, number> = {
      order_status: 0,
      quote_request: 0,
      production_status: 0,
      artwork_issue: 0,
      shipping: 0,
      refund: 0,
      complaint: 0,
      product_inquiry: 0,
      technical_support: 0,
      other: 0
    };

    // Count by channel
    const byChannel: Record<ChannelType, number> = {
      email: 0,
      chat: 0,
      whatsapp: 0,
      instagram: 0,
      facebook: 0,
      phone: 0
    };

    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    let firstResponseSLAMet = 0;
    let firstResponseSLATotal = 0;
    let resolutionSLAMet = 0;
    let resolutionSLATotal = 0;

    for (const ticket of tickets) {
      byStatus[ticket.status]++;
      byPriority[ticket.priority]++;
      byCategory[ticket.category]++;
      byChannel[ticket.channelType]++;

      // Calculate response time
      if (ticket.sla.firstResponseAt) {
        const responseTime = new Date(ticket.sla.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime();
        totalResponseTime += responseTime;
        responseCount++;

        firstResponseSLATotal++;
        if (ticket.sla.firstResponseSLAMet) {
          firstResponseSLAMet++;
        }
      }

      // Calculate resolution time
      if (ticket.resolvedAt) {
        const resolutionTime = new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
        totalResolutionTime += resolutionTime;
        resolutionCount++;

        resolutionSLATotal++;
        if (ticket.sla.resolutionSLAMet) {
          resolutionSLAMet++;
        }
      }
    }

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byCategory,
      byChannel,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      averageResolutionTime: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      slaCompliance: {
        firstResponse: firstResponseSLATotal > 0 ? (firstResponseSLAMet / firstResponseSLATotal) * 100 : 0,
        resolution: resolutionSLATotal > 0 ? (resolutionSLAMet / resolutionSLATotal) * 100 : 0
      }
    };
  }

  /**
   * Detect priority from message content and customer status
   */
  private detectPriority(content: string, isVIP: boolean): TicketPriority {
    const lowerContent = content.toLowerCase();

    // Critical triggers
    const criticalKeywords = ['urgent', 'asap', 'emergency', 'immediately', 'critical'];
    if (criticalKeywords.some(kw => lowerContent.includes(kw))) {
      return 'critical';
    }

    // High priority triggers
    const highKeywords = ['refund', 'cancel', 'angry', 'disappointed', 'complaint', 'manager', 'escalate'];
    if (highKeywords.some(kw => lowerContent.includes(kw)) || isVIP) {
      return 'high';
    }

    // Default to normal
    return 'normal';
  }

  /**
   * Detect category from message content
   */
  private detectCategory(content: string): TicketCategory {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('order') || lowerContent.includes('tracking') || lowerContent.includes('where is')) {
      return 'order_status';
    }

    if (lowerContent.includes('quote') || lowerContent.includes('price') || lowerContent.includes('cost')) {
      return 'quote_request';
    }

    if (lowerContent.includes('production') || lowerContent.includes('printing') || lowerContent.includes('progress')) {
      return 'production_status';
    }

    if (lowerContent.includes('artwork') || lowerContent.includes('design') || lowerContent.includes('file')) {
      return 'artwork_issue';
    }

    if (lowerContent.includes('ship') || lowerContent.includes('delivery') || lowerContent.includes('arrive')) {
      return 'shipping';
    }

    if (lowerContent.includes('refund') || lowerContent.includes('money back')) {
      return 'refund';
    }

    if (lowerContent.includes('complaint') || lowerContent.includes('unhappy') || lowerContent.includes('disappointed')) {
      return 'complaint';
    }

    if (lowerContent.includes('product') || lowerContent.includes('what do you') || lowerContent.includes('do you have')) {
      return 'product_inquiry';
    }

    return 'other';
  }

  /**
   * Detect sentiment from message content
   */
  private detectSentiment(content: string): 'positive' | 'neutral' | 'negative' | 'angry' {
    const lowerContent = content.toLowerCase();

    // Angry indicators
    const angryKeywords = ['angry', 'furious', 'outraged', 'terrible', 'worst', 'horrible', 'unacceptable'];
    if (angryKeywords.some(kw => lowerContent.includes(kw)) || lowerContent.includes('!!!')) {
      return 'angry';
    }

    // Negative indicators
    const negativeKeywords = ['disappointed', 'unhappy', 'problem', 'issue', 'wrong', 'bad', 'poor'];
    if (negativeKeywords.some(kw => lowerContent.includes(kw))) {
      return 'negative';
    }

    // Positive indicators
    const positiveKeywords = ['thank', 'great', 'excellent', 'love', 'amazing', 'perfect', 'happy'];
    if (positiveKeywords.some(kw => lowerContent.includes(kw))) {
      return 'positive';
    }

    return 'neutral';
  }

  /**
   * Generate subject from content and category
   */
  private generateSubject(content: string, category: TicketCategory): string {
    const categoryLabels: Record<TicketCategory, string> = {
      order_status: 'Order Status Inquiry',
      quote_request: 'Quote Request',
      production_status: 'Production Status Inquiry',
      artwork_issue: 'Artwork Issue',
      shipping: 'Shipping Inquiry',
      refund: 'Refund Request',
      complaint: 'Customer Complaint',
      product_inquiry: 'Product Inquiry',
      technical_support: 'Technical Support',
      other: 'Customer Inquiry'
    };

    // Use first 50 characters of content as subject if available
    const contentPreview = content.substring(0, 50).trim();
    if (contentPreview.length > 0) {
      return `${categoryLabels[category]}: ${contentPreview}${content.length > 50 ? '...' : ''}`;
    }

    return categoryLabels[category];
  }

  /**
   * Generate ticket ID
   */
  private generateTicketId(): string {
    return `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

