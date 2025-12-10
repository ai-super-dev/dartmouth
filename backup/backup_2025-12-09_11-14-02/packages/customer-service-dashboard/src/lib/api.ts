import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dartmouth-os-worker.dartmouth.workers.dev'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage')
  if (token) {
    try {
      const { state } = JSON.parse(token)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch (e) {
      console.error('Error parsing auth token:', e)
    }
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
}

// Tickets API
export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; assignedTo?: string; limit?: number; offset?: number }) =>
    api.get('/api/tickets', { params }),
  get: (id: string) => api.get(`/api/tickets/${id}`),
  getById: (ticketId: string) => api.get(`/api/tickets/${ticketId}`),
  getMessages: (ticketId: string) => api.get(`/api/tickets/${ticketId}/messages`),
  assign: (id: string, assignedTo: string) =>
    api.put(`/api/tickets/${id}/assign`, { assignedTo }),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/tickets/${id}/status`, { status }),
  reply: (id: string, content: string, attachments?: Array<{ name: string; content: string; type: string; size: number }>) =>
    api.post(`/api/tickets/${id}/reply`, { content, attachments }),
  addNote: (id: string, content: string, noteType?: string, attachments?: Array<{ name: string; content: string; type: string; size: number }>) =>
    api.post(`/api/tickets/${id}/notes`, { content, noteType, attachments }),
  editNote: (id: string, noteId: string, content: string) =>
    api.put(`/api/tickets/${id}/notes/${noteId}`, { content }),
  deleteNote: (id: string, noteId: string) =>
    api.delete(`/api/tickets/${id}/notes/${noteId}`),
  snooze: (id: string, snoozedUntil: string, reason?: string) =>
    api.post(`/api/tickets/${id}/snooze`, { snoozedUntil, reason }),
  unsnooze: (id: string) => api.post(`/api/tickets/${id}/unsnooze`),
  escalate: (id: string, staffIds: string[], reason: string) =>
    api.post(`/api/tickets/${id}/escalate`, { staffIds, reason }),
  resolveEscalation: (id: string, escalationId: string) =>
    api.post(`/api/tickets/${id}/resolve-escalation`, { escalationId }),
  scheduleReply: (id: string, content: string, scheduledFor: string) =>
    api.post(`/api/tickets/${id}/schedule-reply`, { content, scheduledFor }),
  getScheduledMessages: (id: string) =>
    api.get(`/api/tickets/${id}/scheduled-messages`),
  updateScheduledMessage: (messageId: string, content: string, scheduledFor: string) =>
    api.put(`/api/scheduled-messages/${messageId}`, { content, scheduledFor }),
  deleteScheduledMessage: (messageId: string) =>
    api.delete(`/api/scheduled-messages/${messageId}`),
  getAIDraft: (id: string) =>
    api.get(`/api/tickets/${id}/ai-draft`),
  approveAIDraft: (id: string) =>
    api.post(`/api/tickets/${id}/ai-draft/approve`),
  editAIDraft: (id: string, editedContent: string) =>
    api.post(`/api/tickets/${id}/ai-draft/edit`, { editedContent }),
  rejectAIDraft: (id: string, reason: string) =>
    api.post(`/api/tickets/${id}/ai-draft/reject`, { reason }),
  submitAIDraftFeedback: (id: string, feedback: { qualityScore: number; wasHelpful: boolean; improvementNotes: string; action?: string }) =>
    api.post(`/api/tickets/${id}/ai-draft/feedback`, feedback),
  delete: (id: string) =>
    api.delete(`/api/tickets/${id}`),
  merge: (primaryTicketId: string, secondaryTicketIds: string[]) =>
    api.post(`/api/tickets/${primaryTicketId}/merge`, { secondaryTicketIds }),
  bulkAssign: (ticketIds: string[], assignedTo: string | null) =>
    api.post('/api/tickets/bulk-assign', { ticketIds, assignedTo }),
}

// Staff API
export const staffApi = {
  list: () => api.get('/api/staff'),
  get: (id: string) => api.get(`/api/staff/${id}`),
  me: () => api.get('/api/staff/me'),
  onlineCount: () => api.get('/api/staff/online-count'),
  create: (data: {
    email: string;
    first_name: string;
    last_name?: string;
    role?: string;
    job_title?: string;
    phone?: string;
    department?: string;
    password: string;
  }) => api.post('/api/staff', data),
  update: (id: string, data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    job_title?: string;
    phone?: string;
    department?: string;
    password?: string;
  }) => api.put(`/api/staff/${id}`, data),
  updatePresence: (id: string, isAvailable: boolean) =>
    api.put(`/api/staff/${id}/presence`, { isAvailable }),
  updateAvailability: (id: string, status: 'online' | 'offline' | 'away') =>
    api.put(`/api/staff/${id}/availability`, { status }),
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/api/staff/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: (id: string) => api.delete(`/api/staff/${id}/avatar`),
  getAvatarUrl: (avatarPath: string | null | undefined) => {
    if (!avatarPath) return null;
    // If it's already a full URL, return as is
    if (avatarPath.startsWith('http')) return avatarPath;
    // Otherwise, prepend the API base URL
    const baseUrl = import.meta.env.VITE_API_URL || 'https://dartmouth-os-worker.dartmouth.workers.dev';
    return `${baseUrl}${avatarPath}`;
  },
}

// Chat Settings API
export const chatApi = {
  getSettings: () => api.get('/api/chat/settings'),
  updateSettings: (settings: {
    is_enabled?: boolean;
    primary_color?: string;
    secondary_color?: string;
    button_text?: string;
    welcome_message?: string;
    offline_message?: string;
    timezone?: string;
    show_business_hours?: boolean;
    require_email_when_offline?: boolean;
  }) => api.put('/api/chat/settings', settings),
  getBusinessHours: () => api.get('/api/chat/business-hours'),
  updateBusinessHours: (hours: Array<{
    day_of_week: number;
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  }>) => api.put('/api/chat/business-hours', { hours }),
  getStatus: () => api.get('/api/chat/status'),
  getEmbedCode: () => api.get('/api/chat/embed-code'),
}

// AI Agent RAG Knowledge API
export const ragApi = {
  listDocuments: () => api.get('/api/ai-agent/knowledge'),
  uploadDocument: (file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post('/api/ai-agent/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteDocument: (id: string) => api.delete(`/api/ai-agent/knowledge/${id}`),
  reprocessDocuments: () => api.post('/api/ai-agent/knowledge/reprocess'),
}

// AI Agent System Message API
export const systemMessageApi = {
  getConfig: () => api.get('/api/ai-agent/system-message'),
  updateConfig: (config: {
    role?: string;
    personality?: string;
    responsibilities?: string;
    dos?: string;
    donts?: string;
    tone?: string;
    custom_instructions?: string;
  }) => api.put('/api/ai-agent/system-message', config),
  resetToDefault: () => api.post('/api/ai-agent/system-message/reset'),
}

// Settings API
export const settingsApi = {
  list: () => api.get('/api/settings'),
  get: (key: string) => api.get(`/api/settings/${key}`),
  update: (key: string, value: string) =>
    api.put(`/api/settings/${key}`, { value }),
}

// Analytics API
export const analyticsApi = {
  getAIAgentStats: (timeRange: string = '7d') =>
    api.get('/api/analytics/ai-agent', { params: { timeRange } }),
  getLearningExamples: (limit: number = 10) =>
    api.get('/api/analytics/ai-agent/learning-examples', { params: { limit } }),
}

// Auto-Assignment API
export const autoAssignmentApi = {
  getConfig: () => api.get('/api/auto-assignment/config'),
  updateConfig: (config: {
    enabled?: boolean;
    maxAssignedTickets?: number;
    refillThreshold?: number;
    priorityOrder?: 'priority_first' | 'oldest_first' | 'newest_first';
    channels?: string[];
    businessHoursOnly?: boolean;
  }) => api.put('/api/auto-assignment/config', config),
  runNow: () => api.post('/api/auto-assignment/run'),
  getHistory: (limit?: number) => api.get('/api/auto-assignment/history', { params: { limit } }),
  getStaffSettings: (staffId: string) => api.get(`/api/auto-assignment/staff/${staffId}`),
  updateStaffSettings: (staffId: string, settings: {
    autoAssignEnabled?: boolean;
    autoAssignMax?: number | null;
    autoAssignChannels?: string[] | null;
  }) => api.put(`/api/auto-assignment/staff/${staffId}`, settings),
}

// Shopify Integration API
export const shopifyApi = {
  // Get full Shopify data for a ticket (customer + orders + tracking)
  getTicketData: (email: string) => 
    api.get('/api/shopify/ticket-data', { params: { email } }),
  
  // Get customer info by email
  getCustomer: (email: string) => 
    api.get('/api/shopify/customer', { params: { email } }),
  
  // Get customer's orders
  getCustomerOrders: (customerId: string, limit?: number) => 
    api.get(`/api/shopify/customer/${customerId}/orders`, { params: { limit } }),
  
  // Get orders by email
  getOrdersByEmail: (email: string, limit?: number) => 
    api.get('/api/shopify/orders', { params: { email, limit } }),
  
  // Search for a specific order by number
  searchOrder: (orderNumber: string) => 
    api.get('/api/shopify/order', { params: { number: orderNumber } }),
  
  // Get a specific order by ID
  getOrder: (orderId: string) => 
    api.get(`/api/shopify/order/${orderId}`),
}

// Group Chat API (Internal Staff Communication)
export const groupChatApi = {
  // Channels
  listChannels: () => api.get('/api/group-chat/channels'),
  createChannel: (data: { name: string; description?: string; channelType?: string; memberIds?: string[] }) =>
    api.post('/api/group-chat/channels', data),
  getChannel: (channelId: string) => api.get(`/api/group-chat/channels/${channelId}`),
  updateChannel: (channelId: string, data: { name: string; description?: string; allow_message_editing?: boolean; allow_message_deletion?: boolean; allow_file_deletion?: boolean }) =>
    api.patch(`/api/group-chat/channels/${channelId}`, data),
  archiveChannel: (channelId: string) => api.delete(`/api/group-chat/channels/${channelId}`),

  // Messages
  getMessages: (channelId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/api/group-chat/channels/${channelId}/messages`, { params }),
  sendMessage: (channelId: string, data: { content: string; attachments?: any[] }) =>
    api.post(`/api/group-chat/channels/${channelId}/messages`, data),
  pollMessages: (channelId: string, after?: string) =>
    api.get(`/api/group-chat/channels/${channelId}/poll`, { params: { after } }),
  editMessage: (messageId: string, content: string, deleteAttachment?: boolean) =>
    api.patch(`/api/group-chat/messages/${messageId}`, { content, deleteAttachment }),
  deleteMessage: (messageId: string) => api.delete(`/api/group-chat/messages/${messageId}`),
  addReaction: (messageId: string, emoji: string) =>
    api.post(`/api/group-chat/messages/${messageId}/react`, { emoji }),

  // Members
  getMembers: (channelId: string) => api.get(`/api/group-chat/channels/${channelId}/members`),
  addMember: (channelId: string, staffId: string) =>
    api.post(`/api/group-chat/channels/${channelId}/members`, { staffId }),
  removeMember: (channelId: string, staffId: string) =>
    api.delete(`/api/group-chat/channels/${channelId}/members/${staffId}`),

  // Read Receipts
  markAsRead: (channelId: string, messageId: string) =>
    api.post(`/api/group-chat/channels/${channelId}/read`, { messageId }),
  getUnreadCounts: () => api.get('/api/group-chat/unread'),

  // Global Settings
  getTimeLimit: () => api.get('/api/group-chat/settings/time-limit'),
  setTimeLimit: (timeLimit: number) => api.put('/api/group-chat/settings/time-limit', { timeLimit }),
  getAutoArchiveHours: () => api.get('/api/group-chat/settings/auto-archive'),
  setAutoArchiveHours: (hours: number) => api.put('/api/group-chat/settings/auto-archive', { hours }),
};

// Memos API
export const memosApi = {
  getMemos: (params?: { search?: string; tag?: string }) => api.get('/api/memos', { params }),
  createMemo: (data: { content: string; attachment?: any; tags?: string }) => api.post('/api/memos', data),
  editMemo: (memoId: string, data: { content: string; deleteAttachment?: boolean }) => 
    api.patch(`/api/memos/${memoId}`, data),
  deleteMemo: (memoId: string) => api.delete(`/api/memos/${memoId}`),
};

// Tags API
export const tagsApi = {
  getAllTags: (search?: string) => api.get('/api/tags', { params: search ? { search } : {} }),
  searchTags: (query: string) => api.get('/api/tags/search', { params: { search: query } }),
};

// Email Signatures API
export const signaturesApi = {
  getGlobal: () => api.get('/api/signatures/global'),
  setGlobal: (signatureHtml: string) => api.put('/api/signatures/global', { signatureHtml }),
  getPreview: () => api.get('/api/signatures/preview'),
  getPlainText: () => api.get('/api/signatures/plain-text'),
  uploadLogo: (attachment: { name: string; data: string; type: string; size: number }) => 
    api.post('/api/signatures/upload-logo', { attachment }),
  getSettings: () => api.get('/api/signatures/settings'),
  saveSettings: (settings: { logoUrl: string; companyName: string; email: string; website: string }) =>
    api.put('/api/signatures/settings', settings),
  getPreviewFromSettings: (settings: { logoUrl: string; companyName: string; email: string; website: string }) =>
    api.post('/api/signatures/preview-from-settings', settings),
};

// Mentions API
export const mentionsApi = {
  getMentions: (params?: { 
    channel_id?: string; 
    mentioning_staff_id?: string;
    mentioned_staff_id?: string;
    ticket_number?: string;
    view_all?: boolean;
    is_read?: boolean;
    is_archived?: boolean;
    time_filter?: 'hour' | '12hours' | '24hours';
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/api/mentions', { params }),
  getMention: (mentionId: string) => api.get(`/api/mentions/${mentionId}`),
  markAsRead: (mentionId: string) => api.patch(`/api/mentions/${mentionId}/read`),
  markAsUnread: (mentionId: string) => api.patch(`/api/mentions/${mentionId}/unread`),
  archiveMention: (mentionId: string) => api.patch(`/api/mentions/${mentionId}/archive`),
  getUnreadCount: () => api.get('/api/mentions/unread-count'),
  updateMention: (id: string, data: {
    ticket_id?: string;
    ticket_number?: string;
    customer_name?: string;
    is_read?: boolean;
    ai_action?: string;
    ai_status?: string;
    ai_result?: string;
  }) => api.patch(`/api/mentions/${id}`, data),
  deleteMention: (id: string) => api.delete(`/api/mentions/${id}`),
};

