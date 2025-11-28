/**
 * Internal Communication System
 * 
 * Staff messaging with group channels, @mentions, threads, and real-time notifications.
 * Enables staff collaboration without external tools (Slack, Teams, etc.).
 * 
 * Created: Nov 28, 2025
 * Part of: Dartmouth OS Extensions for Customer Service System
 */

import type { WebSocketService } from './WebSocketService';

/**
 * Channel types
 */
export type ChannelType = 'public' | 'private' | 'direct';

/**
 * Channel
 */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  createdBy: string;
  createdAt: string;
  memberIds: string[];
  archived: boolean;
  metadata?: Record<string, any>;
}

/**
 * Channel message
 */
export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  mentions: string[];  // User IDs mentioned in message
  threadId?: string;   // If part of a thread
  replyCount?: number; // Number of replies (if thread parent)
  attachments?: Array<{
    type: 'image' | 'file' | 'link';
    url: string;
    name?: string;
    size?: number;
  }>;
  reactions?: Array<{
    emoji: string;
    userIds: string[];
  }>;
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * Thread
 */
export interface Thread {
  id: string;
  channelId: string;
  parentMessageId: string;
  messages: ChannelMessage[];
  participantIds: string[];
  createdAt: string;
  lastActivity: string;
}

/**
 * Mention
 */
export interface Mention {
  id: string;
  userId: string;
  messageId: string;
  channelId: string;
  mentionedBy: string;
  mentionedByName: string;
  messagePreview: string;
  read: boolean;
  createdAt: string;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'message' | 'channel_invite' | 'thread_reply';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * Channel member
 */
export interface ChannelMember {
  channelId: string;
  userId: string;
  userName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  lastRead?: string;
  notifications: 'all' | 'mentions' | 'none';
}

/**
 * Internal Communication System
 * 
 * Manages staff messaging, channels, threads, mentions, and notifications.
 */
export class InternalCommunicationSystem {
  private webSocketService?: WebSocketService;
  private channels: Map<string, Channel> = new Map();
  private messages: Map<string, ChannelMessage[]> = new Map(); // channelId -> messages
  private threads: Map<string, Thread> = new Map(); // threadId -> thread
  private mentions: Map<string, Mention[]> = new Map(); // userId -> mentions
  private notifications: Map<string, Notification[]> = new Map(); // userId -> notifications
  private members: Map<string, ChannelMember[]> = new Map(); // channelId -> members

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
    this.initializeDefaultChannels();
    console.log('[InternalCommunicationSystem] Initialized');
  }

  /**
   * Create a new channel
   */
  async createChannel(
    name: string,
    type: ChannelType,
    createdBy: string,
    options?: {
      description?: string;
      memberIds?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<Channel> {
    const channelId = this.generateChannelId(name);

    const channel: Channel = {
      id: channelId,
      name,
      type,
      description: options?.description,
      createdBy,
      createdAt: new Date().toISOString(),
      memberIds: options?.memberIds || [createdBy],
      archived: false,
      metadata: options?.metadata
    };

    this.channels.set(channelId, channel);
    this.messages.set(channelId, []);

    // Add members
    const members: ChannelMember[] = channel.memberIds.map(userId => ({
      channelId,
      userId,
      userName: '', // TODO: Get from user service
      role: userId === createdBy ? 'owner' : 'member',
      joinedAt: new Date().toISOString(),
      notifications: 'all'
    }));
    this.members.set(channelId, members);

    console.log(`[InternalCommunicationSystem] ✅ Channel created: ${name} (${type})`);

    // Notify members via WebSocket
    if (this.webSocketService) {
      await this.webSocketService.sendToUsers(channel.memberIds, {
        type: 'channel_update',
        payload: {
          action: 'created',
          channel
        },
        timestamp: new Date().toISOString()
      });
    }

    return channel;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): Channel | null {
    return this.channels.get(channelId) || null;
  }

  /**
   * Get all channels for a user
   */
  getChannelsForUser(userId: string): Channel[] {
    return Array.from(this.channels.values())
      .filter(channel => channel.memberIds.includes(userId) && !channel.archived);
  }

  /**
   * Add member to channel
   */
  async addMemberToChannel(
    channelId: string,
    userId: string,
    addedBy: string
  ): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Check if already a member
    if (channel.memberIds.includes(userId)) {
      return false;
    }

    // Add member
    channel.memberIds.push(userId);

    const member: ChannelMember = {
      channelId,
      userId,
      userName: '', // TODO: Get from user service
      role: 'member',
      joinedAt: new Date().toISOString(),
      notifications: 'all'
    };

    const channelMembers = this.members.get(channelId) || [];
    channelMembers.push(member);
    this.members.set(channelId, channelMembers);

    console.log(`[InternalCommunicationSystem] ✅ User ${userId} added to channel ${channel.name}`);

    // Notify via WebSocket
    if (this.webSocketService) {
      await this.webSocketService.sendToUser(userId, {
        type: 'channel_update',
        payload: {
          action: 'joined',
          channel
        },
        timestamp: new Date().toISOString()
      });

      // Notify other members
      await this.webSocketService.sendToUsers(
        channel.memberIds.filter(id => id !== userId),
        {
          type: 'channel_update',
          payload: {
            action: 'member_added',
            channel,
            userId,
            addedBy
          },
          timestamp: new Date().toISOString()
        }
      );
    }

    return true;
  }

  /**
   * Remove member from channel
   */
  async removeMemberFromChannel(
    channelId: string,
    userId: string
  ): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Remove from memberIds
    channel.memberIds = channel.memberIds.filter(id => id !== userId);

    // Remove from members
    const channelMembers = this.members.get(channelId) || [];
    this.members.set(
      channelId,
      channelMembers.filter(m => m.userId !== userId)
    );

    console.log(`[InternalCommunicationSystem] ✅ User ${userId} removed from channel ${channel.name}`);

    // Notify via WebSocket
    if (this.webSocketService) {
      await this.webSocketService.sendToUser(userId, {
        type: 'channel_update',
        payload: {
          action: 'removed',
          channelId
        },
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Send message to channel
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    senderName: string,
    content: string,
    options?: {
      threadId?: string;
      attachments?: ChannelMessage['attachments'];
      metadata?: Record<string, any>;
    }
  ): Promise<ChannelMessage> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Check if user is a member
    if (!channel.memberIds.includes(senderId)) {
      throw new Error(`User ${senderId} is not a member of channel ${channelId}`);
    }

    // Extract mentions from content
    const mentions = this.extractMentions(content);

    // Create message
    const messageId = this.generateMessageId();
    const message: ChannelMessage = {
      id: messageId,
      channelId,
      senderId,
      senderName,
      content,
      mentions,
      threadId: options?.threadId,
      attachments: options?.attachments,
      edited: false,
      createdAt: new Date().toISOString(),
      metadata: options?.metadata
    };

    // Store message
    const channelMessages = this.messages.get(channelId) || [];
    channelMessages.push(message);
    this.messages.set(channelId, channelMessages);

    // Handle thread
    if (options?.threadId) {
      await this.addMessageToThread(options.threadId, message);
    }

    // Handle mentions
    if (mentions.length > 0) {
      await this.handleMentions(message, mentions);
    }

    console.log(`[InternalCommunicationSystem] ✅ Message sent to ${channel.name}`);

    // Broadcast via WebSocket
    if (this.webSocketService) {
      await this.webSocketService.broadcastToChannel(
        channelId,
        {
          type: 'message',
          payload: message,
          timestamp: new Date().toISOString()
        },
        channel.memberIds
      );
    }

    return message;
  }

  /**
   * Get messages for channel
   */
  getMessages(channelId: string, limit: number = 50, before?: string): ChannelMessage[] {
    const messages = this.messages.get(channelId) || [];

    let filtered = messages;

    // Filter by timestamp if 'before' is provided
    if (before) {
      filtered = messages.filter(m => m.createdAt < before);
    }

    // Return last N messages
    return filtered.slice(-limit);
  }

  /**
   * Create a thread
   */
  async createThread(
    channelId: string,
    parentMessageId: string
  ): Promise<Thread> {
    const threadId = this.generateThreadId();

    const thread: Thread = {
      id: threadId,
      channelId,
      parentMessageId,
      messages: [],
      participantIds: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.threads.set(threadId, thread);

    // Update parent message
    const channelMessages = this.messages.get(channelId) || [];
    const parentMessage = channelMessages.find(m => m.id === parentMessageId);
    if (parentMessage) {
      parentMessage.replyCount = 0;
    }

    console.log(`[InternalCommunicationSystem] ✅ Thread created for message ${parentMessageId}`);

    return thread;
  }

  /**
   * Get thread
   */
  getThread(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * Get mentions for user
   */
  getMentions(userId: string, unreadOnly: boolean = false): Mention[] {
    const userMentions = this.mentions.get(userId) || [];

    if (unreadOnly) {
      return userMentions.filter(m => !m.read);
    }

    return userMentions;
  }

  /**
   * Mark mention as read
   */
  async markMentionAsRead(userId: string, mentionId: string): Promise<boolean> {
    const userMentions = this.mentions.get(userId) || [];
    const mention = userMentions.find(m => m.id === mentionId);

    if (!mention) return false;

    mention.read = true;

    console.log(`[InternalCommunicationSystem] ✅ Mention ${mentionId} marked as read`);

    return true;
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];

    if (unreadOnly) {
      return userNotifications.filter(n => !n.read);
    }

    return userNotifications;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);

    if (!notification) return false;

    notification.read = true;

    console.log(`[InternalCommunicationSystem] ✅ Notification ${notificationId} marked as read`);

    return true;
  }

  /**
   * Archive channel
   */
  async archiveChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.archived = true;

    console.log(`[InternalCommunicationSystem] ✅ Channel ${channel.name} archived`);

    // Notify members via WebSocket
    if (this.webSocketService) {
      await this.webSocketService.sendToUsers(channel.memberIds, {
        type: 'channel_update',
        payload: {
          action: 'archived',
          channelId
        },
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Extract mentions from message content
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    const mentions: string[] = [];

    for (const match of matches) {
      mentions.push(match[1]);
    }

    // Handle special mentions
    if (content.includes('@here') || content.includes('@channel')) {
      mentions.push('__all__'); // Special marker for all channel members
    }

    return mentions;
  }

  /**
   * Handle mentions in message
   */
  private async handleMentions(message: ChannelMessage, mentions: string[]): Promise<void> {
    const channel = this.channels.get(message.channelId);
    if (!channel) return;

    // Resolve mentions
    let userIds: string[] = [];

    if (mentions.includes('__all__')) {
      // Mention all channel members
      userIds = channel.memberIds.filter(id => id !== message.senderId);
    } else {
      // TODO: Resolve usernames to user IDs
      userIds = mentions; // For now, assume mentions are user IDs
    }

    // Create mention records
    for (const userId of userIds) {
      const mention: Mention = {
        id: this.generateMentionId(),
        userId,
        messageId: message.id,
        channelId: message.channelId,
        mentionedBy: message.senderId,
        mentionedByName: message.senderName,
        messagePreview: message.content.substring(0, 100),
        read: false,
        createdAt: new Date().toISOString()
      };

      const userMentions = this.mentions.get(userId) || [];
      userMentions.push(mention);
      this.mentions.set(userId, userMentions);

      // Create notification
      await this.createNotification(userId, {
        type: 'mention',
        title: `${message.senderName} mentioned you`,
        message: message.content.substring(0, 100),
        link: `/channels/${message.channelId}/messages/${message.id}`,
        metadata: {
          messageId: message.id,
          channelId: message.channelId
        }
      });
    }

    // Send WebSocket notifications
    if (this.webSocketService) {
      await this.webSocketService.sendToUsers(userIds, {
        type: 'mention',
        payload: {
          message,
          channel: channel.name
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add message to thread
   */
  private async addMessageToThread(threadId: string, message: ChannelMessage): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    thread.messages.push(message);
    thread.lastActivity = new Date().toISOString();

    // Add participant if not already in thread
    if (!thread.participantIds.includes(message.senderId)) {
      thread.participantIds.push(message.senderId);
    }

    // Update reply count on parent message
    const channelMessages = this.messages.get(thread.channelId) || [];
    const parentMessage = channelMessages.find(m => m.id === thread.parentMessageId);
    if (parentMessage) {
      parentMessage.replyCount = (parentMessage.replyCount || 0) + 1;
    }
  }

  /**
   * Create notification
   */
  private async createNotification(
    userId: string,
    options: {
      type: Notification['type'];
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type: options.type,
      title: options.title,
      message: options.message,
      link: options.link,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: options.metadata
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.push(notification);
    this.notifications.set(userId, userNotifications);

    // Send WebSocket notification
    if (this.webSocketService) {
      await this.webSocketService.sendToUser(userId, {
        type: 'notification',
        payload: notification,
        timestamp: new Date().toISOString()
      });
    }

    return notification;
  }

  /**
   * Initialize default channels
   */
  private initializeDefaultChannels(): void {
    const defaultChannels = [
      { name: 'general', type: 'public' as ChannelType, description: 'General discussion' },
      { name: 'graphic-design', type: 'public' as ChannelType, description: 'Graphic design team' },
      { name: 'managers', type: 'private' as ChannelType, description: 'Managers and team leads' },
      { name: 'sales-team', type: 'public' as ChannelType, description: 'Sales team' },
      { name: 'production', type: 'public' as ChannelType, description: 'Production team' }
    ];

    for (const channel of defaultChannels) {
      this.createChannel(
        channel.name,
        channel.type,
        'system',
        { description: channel.description }
      );
    }

    console.log('[InternalCommunicationSystem] ✅ Default channels initialized');
  }

  /**
   * Generate IDs
   */
  private generateChannelId(name: string): string {
    return `channel_${name.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateMentionId(): string {
    return `mention_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalChannels: number;
    totalMessages: number;
    totalThreads: number;
    totalMentions: number;
    totalNotifications: number;
  } {
    return {
      totalChannels: this.channels.size,
      totalMessages: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      totalThreads: this.threads.size,
      totalMentions: Array.from(this.mentions.values()).reduce((sum, mentions) => sum + mentions.length, 0),
      totalNotifications: Array.from(this.notifications.values()).reduce((sum, notifs) => sum + notifs.length, 0)
    };
  }
}

