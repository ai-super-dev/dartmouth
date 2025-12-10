/**
 * Customer Service API Routes
 * Using Hono framework for better routing
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/shared';

// Middleware
import { authenticate, requireAdmin, requireManagerOrAdmin } from '../middleware/auth';

// Controllers
import * as authController from '../controllers/auth';
import * as ticketsController from '../controllers/tickets';
import * as mentionsController from '../controllers/mentions';
import * as settingsController from '../controllers/settings';
import * as staffController from '../controllers/staff';
import * as emailsV2Controller from '../controllers/emails-v2';
import * as emailTestController from '../controllers/email-test';
import * as analyticsController from '../controllers/analytics';
import * as chatController from '../controllers/chat';
import * as chatMessagesController from '../controllers/chat-messages';
import * as aiAgentController from '../controllers/ai-agent';
import * as tenantSettingsController from '../controllers/tenant-settings';
import * as autoAssignmentController from '../controllers/auto-assignment';
import * as shopifyController from '../controllers/shopify';
import * as attachmentsController from '../controllers/attachments';
import * as integrationsController from '../controllers/integrations';
import * as groupChatController from '../controllers/group-chat';
import * as memosController from '../controllers/memos';
import * as tagsController from '../controllers/tags';
import * as signaturesController from '../controllers/signatures';

/**
 * Create API router
 */
export function createAPIRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Enable CORS
  app.use('/*', cors());

  // Debug middleware to log all requests
  app.use('/*', async (c, next) => {
    console.log('[API Router] Request:', c.req.method, c.req.url);
    await next();
  });

  // ========================================================================
  // AUTHENTICATION ROUTES
  // ========================================================================

  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/logout', authController.logout);
  app.get('/api/auth/me', authenticate, authController.me);

  // ========================================================================
  // TICKETS ROUTES
  // ========================================================================

  app.get('/api/tickets', authenticate, ticketsController.listTickets);
  app.get('/api/tickets/:id', authenticate, ticketsController.getTicket);
  app.get('/api/tickets/:id/messages', authenticate, ticketsController.getTicketMessages);
  app.put('/api/tickets/:id/assign', authenticate, requireManagerOrAdmin, ticketsController.assignTicket);
  app.put('/api/tickets/:id/status', authenticate, ticketsController.updateTicketStatus);
  app.post('/api/tickets/:id/reply', authenticate, ticketsController.replyToTicket);
  app.post('/api/tickets/:id/notes', authenticate, ticketsController.addNote);
  app.put('/api/tickets/:id/notes/:noteId', authenticate, ticketsController.editNote);
  app.delete('/api/tickets/:id/notes/:noteId', authenticate, ticketsController.deleteNote);
  app.post('/api/tickets/:id/snooze', authenticate, ticketsController.snoozeTicket);
  app.post('/api/tickets/:id/unsnooze', authenticate, ticketsController.unsnoozeTicket);
  app.post('/api/tickets/:id/escalate', authenticate, ticketsController.escalateTicket);
  app.post('/api/tickets/:id/resolve-escalation', authenticate, ticketsController.resolveEscalation);
  app.post('/api/tickets/:id/schedule-reply', authenticate, ticketsController.scheduleReply);
  app.delete('/api/tickets/:id', authenticate, requireAdmin, ticketsController.deleteTicket);
  app.post('/api/tickets/bulk-assign', authenticate, ticketsController.bulkAssignTickets);
  app.post('/api/tickets/:id/merge', authenticate, ticketsController.mergeTickets);
  app.get('/api/tickets/:id/scheduled-messages', authenticate, ticketsController.getScheduledMessages);
  app.put('/api/scheduled-messages/:messageId', authenticate, ticketsController.updateScheduledMessage);
  app.delete('/api/scheduled-messages/:messageId', authenticate, ticketsController.deleteScheduledMessage);

  // AI Draft Response Routes
  app.get('/api/tickets/:id/ai-draft', authenticate, ticketsController.getAIDraftResponse);
  app.post('/api/tickets/:id/ai-draft/approve', authenticate, ticketsController.approveAIDraftResponse);
  app.post('/api/tickets/:id/ai-draft/edit', authenticate, ticketsController.editAIDraftResponse);
  app.post('/api/tickets/:id/ai-draft/reject', authenticate, ticketsController.rejectAIDraftResponse);
  app.post('/api/tickets/:id/ai-draft/feedback', authenticate, ticketsController.submitAIDraftFeedback);

  // ========================================================================
  // MENTIONS ROUTES
  // ========================================================================

  // Mentions routes moved to end of file to avoid conflicts

  // ========================================================================
  // SETTINGS ROUTES
  // ========================================================================

  app.get('/api/settings', authenticate, requireAdmin, settingsController.listSettings);
  app.get('/api/settings/:key', authenticate, requireAdmin, settingsController.getSetting);
  app.put('/api/settings/:key', authenticate, requireAdmin, settingsController.updateSetting);

  // ========================================================================
  // STAFF ROUTES
  // ========================================================================

  app.get('/api/staff', authenticate, staffController.listStaff);
  app.get('/api/staff/me', authenticate, staffController.getCurrentStaff);
  app.get('/api/staff/online-count', authenticate, staffController.getOnlineStaffCount);
  app.get('/api/staff/avatar/*', staffController.getAvatar); // Public - serve avatar images
  app.get('/api/staff/:id', authenticate, staffController.getStaff);
  app.post('/api/staff', authenticate, staffController.createStaff);
  app.put('/api/staff/:id', authenticate, staffController.updateStaff);
  app.put('/api/staff/:id/presence', authenticate, staffController.updatePresence);
  app.put('/api/staff/:id/availability', authenticate, staffController.updateAvailability);
  app.post('/api/staff/:id/avatar', authenticate, staffController.uploadAvatar);
  app.delete('/api/staff/:id/avatar', authenticate, staffController.deleteAvatar);

  // ========================================================================
  // BUSINESS HOURS & CHAT SETTINGS ROUTES
  // ========================================================================

  app.get('/api/chat/settings', authenticate, chatController.getChatSettings);
  app.put('/api/chat/settings', authenticate, requireAdmin, chatController.updateChatSettings);
  app.get('/api/chat/business-hours', authenticate, chatController.getBusinessHours);
  app.put('/api/chat/business-hours', authenticate, requireAdmin, chatController.updateBusinessHours);
  app.get('/api/chat/status', chatController.getChatStatus); // Public endpoint for widget

  // Live Chat Messaging (public endpoint for widget)
  app.post('/api/chat/message', chatMessagesController.sendMessage);
  app.post('/api/chat/callback', chatMessagesController.submitCallback); // Callback request when offline
  app.post('/api/chat/callback-from-chat', chatMessagesController.submitCallbackFromChat); // Callback from active chat
  
  // Chat - Public endpoints for widget
  app.post('/api/chat/start', chatMessagesController.startConversation); // Start conversation when user enters name/email
  
  // Embed Code Generator (authenticated)
  app.get('/api/chat/embed-code', authenticate, chatMessagesController.getEmbedCode);
  
  // Chat Conversations (authenticated - for staff dashboard)
  app.get('/api/chat/conversations', authenticate, chatMessagesController.listConversations);
  app.get('/api/chat/conversation/:id', authenticate, chatMessagesController.getConversation);
  app.get('/api/chat/conversation/:id/poll', chatMessagesController.pollMessages); // Public - for widget polling
  app.get('/api/chat/conversation/by-ticket/:ticketId', authenticate, chatMessagesController.getConversationByTicket);
  app.post('/api/chat/conversation/:id/takeover', authenticate, chatMessagesController.takeoverConversation);
  app.post('/api/chat/conversation/:id/reply', authenticate, chatMessagesController.staffReply);
  app.post('/api/chat/conversation/:id/pickup', authenticate, chatMessagesController.pickupFromQueue);
  app.post('/api/chat/conversation/:id/close', authenticate, chatMessagesController.closeConversation);
  app.post('/api/chat/conversation/:id/rate', chatMessagesController.submitChatRating); // Public - for customers
  app.post('/api/chat/conversation/:id/reassign', authenticate, chatMessagesController.reassignConversation);

  // ========================================================================
  // ANALYTICS ROUTES
  // ========================================================================

  app.get('/api/analytics/ai-agent', authenticate, analyticsController.getAIAgentStats);
  app.get('/api/analytics/ai-agent/learning-examples', authenticate, analyticsController.getLearningExamples);

  // ========================================================================
  // AI AGENT CONFIGURATION ROUTES
  // ========================================================================

  // RAG Knowledge Documents
  app.get('/api/ai-agent/knowledge', authenticate, aiAgentController.listKnowledgeDocuments);
  app.get('/api/ai-agent/knowledge/stats', authenticate, aiAgentController.getVectorRAGStats);
  app.post('/api/ai-agent/knowledge/upload', authenticate, requireAdmin, aiAgentController.uploadKnowledgeDocument);
  app.delete('/api/ai-agent/knowledge/:id', authenticate, requireAdmin, aiAgentController.deleteKnowledgeDocument);
  app.post('/api/ai-agent/knowledge/reprocess', authenticate, requireAdmin, aiAgentController.reprocessKnowledgeDocuments);

  // System Message Configuration
  app.get('/api/ai-agent/system-message', authenticate, aiAgentController.getSystemMessageConfig);
  app.put('/api/ai-agent/system-message', authenticate, requireAdmin, aiAgentController.updateSystemMessageConfig);
  app.post('/api/ai-agent/system-message/reset', authenticate, requireAdmin, aiAgentController.resetSystemMessageConfig);

  // Agent Regional Overrides
  app.get('/api/ai-agent/regional-overrides', authenticate, aiAgentController.getRegionalOverrides);
  app.put('/api/ai-agent/regional-overrides', authenticate, requireAdmin, aiAgentController.updateRegionalOverrides);

  // ========================================================================
  // TENANT SETTINGS ROUTES (Dartmouth OS Settings)
  // ========================================================================

  app.get('/api/tenant/settings', authenticate, tenantSettingsController.getTenantSettings);
  app.put('/api/tenant/settings', authenticate, requireAdmin, tenantSettingsController.updateTenantSettings);
  app.get('/api/tenant/settings/options', authenticate, tenantSettingsController.getTenantSettingsOptions);

  // ========================================================================
  // EMAIL SYSTEM V2 ROUTES (Conversations + MailChannels)
  // ========================================================================

  app.get('/api/v2/conversations', authenticate, emailsV2Controller.listConversations);
  app.get('/api/v2/conversations/:id', authenticate, emailsV2Controller.getConversation);
  app.post('/api/v2/conversations/:id/reply', authenticate, emailsV2Controller.replyToConversation);

  // ========================================================================
  // EMAIL SYSTEM V2 TEST ROUTES (Development Only)
  // ========================================================================

  // Simple test route to verify routing works
  app.get('/api/v2/test/ping', (c) => {
    return c.json({ success: true, message: 'Email V2 test routes are working!' });
  });

  app.post('/api/v2/test/inbound', emailTestController.simulateInboundEmail);
  app.post('/api/v2/test/outbound', emailTestController.testOutboundEmail);
  app.post('/api/v2/test/full-flow', emailTestController.testFullEmailFlow);
  app.get('/api/v2/test/conversations', emailTestController.listTestConversations);
  app.post('/api/v2/test/cleanup', emailTestController.cleanupTestData);

  // ========================================================================
  // AUTO-ASSIGNMENT ROUTES
  // ========================================================================

  app.get('/api/auto-assignment/config', authenticate, requireAdmin, autoAssignmentController.getConfig);
  app.put('/api/auto-assignment/config', authenticate, requireAdmin, autoAssignmentController.updateConfig);
  app.post('/api/auto-assignment/run', authenticate, requireAdmin, autoAssignmentController.runNow);
  app.get('/api/auto-assignment/history', authenticate, requireAdmin, autoAssignmentController.getHistory);
  app.get('/api/auto-assignment/staff/:staffId', authenticate, autoAssignmentController.getStaffSettings);
  app.put('/api/auto-assignment/staff/:staffId', authenticate, autoAssignmentController.updateStaffSettings);

  // ========================================================================
  // SHOPIFY INTEGRATION ROUTES
  // ========================================================================

  app.get('/api/shopify/customer', authenticate, shopifyController.getCustomerByEmail);
  app.get('/api/shopify/customer/:customerId/orders', authenticate, shopifyController.getCustomerOrders);
  app.get('/api/shopify/orders', authenticate, shopifyController.getOrdersByEmail);
  app.get('/api/shopify/order', authenticate, shopifyController.searchOrder);
  app.get('/api/shopify/order/:orderId', authenticate, shopifyController.getOrder);
  app.get('/api/shopify/ticket-data', authenticate, shopifyController.getTicketShopifyData);

  // Integrations routes
  app.get('/api/integrations', authenticate, integrationsController.getIntegrations);
  app.get('/api/integrations/debug', authenticate, requireAdmin, integrationsController.debugIntegrations);
  app.post('/api/integrations/:id/test', authenticate, requireAdmin, integrationsController.testIntegration);
  app.post('/api/integrations/:id/settings', authenticate, requireAdmin, integrationsController.saveIntegrationSettings);

  // Attachments routes (public - no auth required for serving files)
  app.get('/api/attachments/*', attachmentsController.serveAttachmentWildcard);

  // ========================================================================
  // GROUP CHAT ROUTES (Internal Staff Communication)
  // ========================================================================

  // Channels
  app.get('/api/group-chat/channels', authenticate, groupChatController.listChannels);
  app.post('/api/group-chat/channels', authenticate, groupChatController.createChannel);
  app.get('/api/group-chat/channels/:id', authenticate, groupChatController.getChannel);
  app.patch('/api/group-chat/channels/:id', authenticate, groupChatController.updateChannel);
  app.delete('/api/group-chat/channels/:id', authenticate, groupChatController.archiveChannel);

  // Messages
  app.get('/api/group-chat/channels/:id/messages', authenticate, groupChatController.getMessages);
  app.post('/api/group-chat/channels/:id/messages', authenticate, groupChatController.sendMessage);
  app.get('/api/group-chat/channels/:id/poll', authenticate, groupChatController.pollMessages);
  app.patch('/api/group-chat/messages/:id', authenticate, groupChatController.editMessage);
  app.delete('/api/group-chat/messages/:id', authenticate, groupChatController.deleteMessage);
  app.post('/api/group-chat/messages/:id/react', authenticate, groupChatController.addReaction);

  // Members
  app.get('/api/group-chat/channels/:id/members', authenticate, groupChatController.getMembers);
  app.post('/api/group-chat/channels/:id/members', authenticate, groupChatController.addMember);
  app.delete('/api/group-chat/channels/:id/members/:staffId', authenticate, groupChatController.removeMember);

  // Read Receipts
  app.post('/api/group-chat/channels/:id/read', authenticate, groupChatController.markAsRead);
  app.get('/api/group-chat/unread', authenticate, groupChatController.getUnreadCounts);

  // Global Settings
  app.get('/api/group-chat/settings/time-limit', authenticate, groupChatController.getTimeLimit);
  app.put('/api/group-chat/settings/time-limit', authenticate, groupChatController.setTimeLimit);
  app.get('/api/group-chat/settings/auto-archive', authenticate, groupChatController.getAutoArchiveHours);
  app.put('/api/group-chat/settings/auto-archive', authenticate, groupChatController.setAutoArchiveHours);

  // ========================================================================
  // MEMOS
  // ========================================================================
  app.get('/api/memos', authenticate, memosController.getMemos);
  app.post('/api/memos', authenticate, memosController.createMemo);
  app.patch('/api/memos/:id', authenticate, memosController.editMemo);
  app.delete('/api/memos/:id', authenticate, memosController.deleteMemo);
  
  // ========================================================================
  // TAGS ROUTES
  // ========================================================================
  
  app.get('/api/tags', authenticate, tagsController.getAllTags);
  app.get('/api/tags/search', authenticate, tagsController.searchTags);

  // ========================================================================
  // EMAIL SIGNATURES
  // ========================================================================
  
  app.get('/api/signatures/global', authenticate, signaturesController.getGlobalSignature);
  app.put('/api/signatures/global', authenticate, signaturesController.setGlobalSignature);
  app.get('/api/signatures/preview', authenticate, signaturesController.getSignaturePreview);
  app.get('/api/signatures/plain-text', authenticate, signaturesController.getSignaturePlainText);
  app.post('/api/signatures/upload-logo', authenticate, signaturesController.uploadLogo);
  app.get('/api/signatures/settings', authenticate, signaturesController.getSettings);
  app.put('/api/signatures/settings', authenticate, signaturesController.saveSettings);
  app.post('/api/signatures/preview-from-settings', authenticate, signaturesController.getPreviewFromSettings);

  // ========================================================================
  // @MENTIONS ROUTES
  // ========================================================================
  
  app.get('/api/mentions', authenticate, mentionsController.getMentions);
  app.get('/api/mentions/unread-count', authenticate, mentionsController.getUnreadCount);
  app.get('/api/mentions/:id', authenticate, mentionsController.getMention);
  app.patch('/api/mentions/:id', authenticate, mentionsController.updateMention);
  app.patch('/api/mentions/:id/read', authenticate, mentionsController.markMentionAsRead);
  app.patch('/api/mentions/:id/unread', authenticate, mentionsController.markMentionAsUnread);
  app.patch('/api/mentions/:id/archive', authenticate, mentionsController.archiveMention);
  app.delete('/api/mentions/:id', authenticate, mentionsController.deleteMention);

  return app;
}

