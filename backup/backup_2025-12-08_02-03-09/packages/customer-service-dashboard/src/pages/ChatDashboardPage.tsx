import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Send, UserPlus, Sparkles, Clock, CheckCircle, XCircle, Bot, Users, Inbox, Archive, ChevronLeft, ChevronRight, Paperclip, X, Phone } from 'lucide-react';
import { api, ticketsApi } from '../lib/api';
import { useSearchParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ChatConversation {
  id: string;
  ticket_id: string;
  ticket_number: string; // Actual ticket number like TKT-000178
  customer_name: string;
  customer_email: string;
  // New status model: ai_handling, queued, assigned, staff_handling, closed
  status: 'ai_handling' | 'queued' | 'assigned' | 'staff_handling' | 'closed';
  assigned_to: string | null;
  assigned_staff_first_name: string | null;
  assigned_staff_last_name: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  last_message: string;
  priority?: string;
  sentiment?: string;
  resolution_type?: 'ai_resolved' | 'staff_resolved' | 'inactive_closed' | 'abandoned';
  queue_entered_at?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'staff' | 'ai' | 'system';
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  created_at: string;
}

type TabType = 'ai' | 'staff' | 'queued' | 'closed';

const chatApi = {
  listConversations: async (tab: TabType) => {
    const response = await api.get(`/api/chat/conversations?tab=${tab}`);
    return response.data;
  },
  getConversation: async (id: string) => {
    const response = await api.get(`/api/chat/conversation/${id}`);
    return response.data;
  },
  takeoverConversation: async (id: string) => {
    const response = await api.post(`/api/chat/conversation/${id}/takeover`);
    return response.data;
  },
  replyToConversation: async (id: string, message: string) => {
    const response = await api.post(`/api/chat/conversation/${id}/reply`, { message });
    return response.data;
  },
  closeConversation: async (id: string, resolutionType: 'resolved' | 'closed') => {
    const response = await api.post(`/api/chat/conversation/${id}/close`, { resolution_type: resolutionType });
    return response.data;
  },
  pickupFromQueue: async (id: string) => {
    const response = await api.post(`/api/chat/conversation/${id}/pickup`);
    return response.data;
  },
  reassignConversation: async (id: string, assignTo: string, reason?: string) => {
    const response = await api.post(`/api/chat/conversation/${id}/reassign`, { assignTo, reason });
    return response.data;
  },
  getStaffList: async () => {
    const response = await api.get('/api/staff');
    return response.data;
  },
};

// Tab configuration
const tabs: { key: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'ai', label: 'AI', icon: <Sparkles className="w-4 h-4" />, description: 'Active chats with AI' },
  { key: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" />, description: 'Escalated to staff' },
  { key: 'queued', label: 'Queued', icon: <Inbox className="w-4 h-4" />, description: 'Awaiting staff' },
  { key: 'closed', label: 'Closed', icon: <Archive className="w-4 h-4" />, description: 'Resolved & inactive' },
];

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  availability_status: string;
}

// Helper function to get full attachment URL
const getAttachmentUrl = (attachmentUrl: string | null | undefined): string => {
  if (!attachmentUrl) return '';
  if (attachmentUrl.startsWith('data:') || attachmentUrl.startsWith('http')) {
    return attachmentUrl;
  }
  return `https://dartmouth-os-worker.dartmouth.workers.dev/api/attachments/${attachmentUrl}`;
};

export default function ChatDashboardPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [reassignReason, setReassignReason] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [staffNotesHeight, setStaffNotesHeight] = useState(250);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showShopify, setShowShopify] = useState(false);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset order index when conversation changes or Shopify panel opens
  useEffect(() => {
    setCurrentOrderIndex(0);
  }, [selectedConversation, showShopify]);

  // Keyboard shortcut: Ctrl+Y for Staff Notes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        setShowInternalNotes(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for conversation or ticket param in URL (from ticket list click)
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    const ticketId = searchParams.get('ticket');
    
    if (conversationId) {
      setSelectedConversation(conversationId);
      // Remove from URL after setting
      searchParams.delete('conversation');
      setSearchParams(searchParams, { replace: true });
    } else if (ticketId) {
      // Fetch conversation by ticket ID
      api.get(`/api/chat/conversation/by-ticket/${ticketId}`)
        .then(res => {
          if (res.data.conversation) {
            setSelectedConversation(res.data.conversation.id);
            // Determine which tab based on conversation status
            const conv = res.data.conversation;
            if (conv.status === 'closed' || conv.resolution_type) {
              setActiveTab('closed');
            } else if (conv.status === 'queued') {
              setActiveTab('queued');
            } else if (conv.status === 'ai_handling') {
              setActiveTab('ai');
            } else if (conv.status === 'assigned' || conv.status === 'staff_handling') {
              setActiveTab('staff');
            } else {
              setActiveTab('ai'); // Default to AI tab
            }
          }
        })
        .catch(err => console.error('Failed to find conversation for ticket:', err));
      // Remove from URL after setting
      searchParams.delete('ticket');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch conversations for active tab
  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['chat-conversations', activeTab],
    queryFn: () => chatApi.listConversations(activeTab),
    refetchInterval: 5000,
  });

  // Fetch all tab counts
  const { data: tabCounts } = useQuery({
    queryKey: ['chat-tab-counts'],
    queryFn: async () => {
      const [ai, staff, queued, closed] = await Promise.all([
        api.get('/api/chat/conversations?tab=ai&count_only=true'),
        api.get('/api/chat/conversations?tab=staff&count_only=true'),
        api.get('/api/chat/conversations?tab=queued&count_only=true'),
        api.get('/api/chat/conversations?tab=closed&count_only=true'),
      ]);
      return {
        ai: ai.data.count || 0,
        staff: staff.data.count || 0,
        queued: queued.data.count || 0,
        closed: closed.data.count || 0,
      };
    },
    refetchInterval: 10000,
  });

  // Fetch selected conversation details
  const { data: conversationData, isLoading: loadingConversation } = useQuery({
    queryKey: ['chat-conversation', selectedConversation],
    queryFn: () => chatApi.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  const messages: ChatMessage[] = conversationData?.messages || [];
  const currentConversation = conversationData?.conversation;

  // Fetch Shopify data for the current conversation
  const { data: shopifyData, isLoading: shopifyLoading } = useQuery({
    queryKey: ['shopify-data', currentConversation?.customer_email],
    queryFn: async () => {
      if (!currentConversation?.customer_email) return null;
      const response = await api.get(`/api/shopify/ticket-data?email=${encodeURIComponent(currentConversation.customer_email)}`);
      return response.data;
    },
    enabled: !!currentConversation?.customer_email && showShopify,
  });

  // Fetch notes for the selected conversation's ticket
  const { data: notesData, refetch: refetchNotes } = useQuery({
    queryKey: ['ticket-notes', currentConversation?.ticket_id],
    queryFn: async () => {
      if (!currentConversation?.ticket_id) return null;
      const response = await ticketsApi.get(currentConversation.ticket_id);
      return response.data;
    },
    enabled: !!currentConversation?.ticket_id,
  });
  const notes = notesData?.notes || [];

  // Takeover mutation
  const takeoverMutation = useMutation({
    mutationFn: (id: string) => chatApi.takeoverConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tab-counts'] });
    },
  });

  // Pickup from queue mutation
  const pickupMutation = useMutation({
    mutationFn: (id: string) => chatApi.pickupFromQueue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tab-counts'] });
      setActiveTab('staff'); // Switch to staff tab after pickup
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => 
      chatApi.replyToConversation(id, message),
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
    },
  });

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: ({ id, resolutionType }: { id: string; resolutionType: 'resolved' | 'closed' }) => 
      chatApi.closeConversation(id, resolutionType),
    onSuccess: () => {
      setSelectedConversation(null);
      setShowCloseModal(false);
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tab-counts'] });
    },
  });

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: ({ id, assignTo, reason }: { id: string; assignTo: string; reason?: string }) => 
      chatApi.reassignConversation(id, assignTo, reason),
    onSuccess: () => {
      setShowReassignModal(false);
      setReassignTo('');
      setReassignReason('');
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tab-counts'] });
    },
  });

  // Fetch staff list for reassignment and staff filter dropdown
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => chatApi.getStaffList(),
    enabled: showReassignModal || activeTab === 'staff',
  });
  const staffList: StaffMember[] = staffData?.staff || [];

  const conversations: ChatConversation[] = conversationsData?.conversations || [];

  // Auto-select newest conversation on page load (only if no conversation is selected)
  useEffect(() => {
    if (!selectedConversation && conversations.length > 0 && !loadingConversations) {
      // Select the first (newest) conversation
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation, loadingConversations]);

  // Filtered conversations for navigation
  const filteredConversations = conversations.filter((conv) => 
    staffFilter === 'all' || conv.assigned_to === staffFilter
  );

  // Navigation handlers
  const handlePreviousConversation = () => {
    if (!selectedConversation || filteredConversations.length === 0) return;
    const currentIndex = filteredConversations.findIndex(c => c.id === selectedConversation);
    if (currentIndex > 0) {
      setSelectedConversation(filteredConversations[currentIndex - 1].id);
    }
  };

  const handleNextConversation = () => {
    if (!selectedConversation || filteredConversations.length === 0) return;
    const currentIndex = filteredConversations.findIndex(c => c.id === selectedConversation);
    if (currentIndex < filteredConversations.length - 1) {
      setSelectedConversation(filteredConversations[currentIndex + 1].id);
    }
  };

  // Check if navigation is possible
  const currentIndex = selectedConversation 
    ? filteredConversations.findIndex(c => c.id === selectedConversation) 
    : -1;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < filteredConversations.length - 1;

  // Resize handle logic for Staff Notes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingNotes) return
      
      const newHeight = staffNotesHeight + (window.innerHeight - e.clientY - staffNotesHeight)
      const minHeight = 150
      const maxHeight = window.innerHeight * 0.6
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setStaffNotesHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsResizingNotes(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isResizingNotes) {
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingNotes, staffNotesHeight])

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle file selection for staff notes
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Validate file sizes
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        e.target.value = '';
        return;
      }
    }
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = () => {
    if (!selectedConversation || !replyMessage.trim()) return;
    replyMutation.mutate({ id: selectedConversation, message: replyMessage.trim() });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  };

  const getQueueWaitTime = (queueEnteredAt?: string) => {
    if (!queueEnteredAt) return null;
    const entered = new Date(queueEnteredAt);
    const now = new Date();
    const diffMs = now.getTime() - entered.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min';
    return `${diffMins} mins`;
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
      case 'critical':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{priority}</span>;
      case 'high':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">high</span>;
      default:
        return null;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'angry':
        return <span className="text-xs">😡</span>;
      case 'negative':
        return <span className="text-xs">😟</span>;
      case 'positive':
        return <span className="text-xs">😊</span>;
      default:
        return null;
    }
  };

  const getResolutionBadge = (resolutionType?: string) => {
    switch (resolutionType) {
      case 'ai_resolved':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> AI Resolved</span>;
      case 'staff_resolved':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Staff Resolved</span>;
      case 'inactive_closed':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        {/* Header with Tabs */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <Link 
              to="/tickets" 
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to Tickets"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
            </svg>
            Live Chats
          </h2>
          <div className="flex gap-1 mb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedConversation(null);
                }}
                className={`flex-1 flex flex-col items-center px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={tab.description}
              >
                {tab.icon}
                <span className="mt-0.5">{tab.label}</span>
                {tabCounts && tabCounts[tab.key] > 0 && (
                  <span className={`mt-0.5 px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Staff Filter Dropdown - Same size as action buttons (h-7) */}
          <select
            value={activeTab === 'staff' ? staffFilter : 'all'}
            onChange={(e) => setStaffFilter(e.target.value)}
            disabled={activeTab !== 'staff'}
            className={`w-full h-7 text-xs border rounded-lg px-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              activeTab === 'staff' 
                ? 'border-indigo-300 bg-white' 
                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <option value="all">All Staff</option>
            {staffList
              .filter((staff) => staff.id !== 'ai-agent-001')
              .map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name} ({
                  staff.availability_status === 'online' ? 'Online' : 
                  staff.availability_status === 'away' ? 'Away' : 'Offline'
                })
              </option>
            ))}
          </select>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="text-gray-300 mb-2">
                {activeTab === 'ai' && <Bot className="w-8 h-8 mx-auto" />}
                {activeTab === 'staff' && <Users className="w-8 h-8 mx-auto" />}
                {activeTab === 'queued' && <Inbox className="w-8 h-8 mx-auto" />}
                {activeTab === 'closed' && <Archive className="w-8 h-8 mx-auto" />}
              </div>
              {staffFilter !== 'all' 
                ? `No chats for selected staff member`
                : `No ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()} chats`
              }
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{conv.customer_name}</p>
                      <p className="text-xs text-gray-500">{conv.customer_email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 truncate">
                  {conv.last_message === '__SHOW_CALLBACK_FORM__' 
                    ? 'CALL BACK REQUEST' 
                    : (conv.last_message || 'No messages yet')}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {/* Priority & Sentiment */}
                  {getPriorityBadge(conv.priority)}
                  {getSentimentBadge(conv.sentiment)}
                  
                  {/* Tab-specific badges */}
                  {activeTab === 'ai' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> McCarthy AI
                    </span>
                  )}
                  {activeTab === 'staff' && conv.assigned_staff_first_name && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      👤 {conv.assigned_staff_first_name}
                    </span>
                  )}
                  {activeTab === 'queued' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {getQueueWaitTime(conv.queue_entered_at) || 'Waiting'}
                    </span>
                  )}
                  {activeTab === 'closed' && getResolutionBadge(conv.resolution_type)}
                  
                  <span className="text-xs text-gray-400">
                    {conv.message_count} msgs
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area - EXACT MATCH to ChatTicketDetailPage */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
              </svg>
              <p>Select a conversation to view</p>
            </div>
          </div>
        ) : loadingConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading conversation...
          </div>
        ) : (
          <>
            {/* Header - EXACT MATCH to ChatTicketDetailPage */}
            <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
              {/* Top Row: Ticket number, badges, and assigned to */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center gap-2">
                    {currentConversation?.subject?.toLowerCase().includes('callback request') ? (
                      <Phone className="w-4 h-4 text-red-600 fill-current" />
                    ) : (
                      <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                        <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                      </svg>
                    )}
                    <h1 className="text-base font-semibold text-gray-900">
                      {currentConversation?.ticket_number || 'Chat'}
                    </h1>
                  </div>
                  <button className={`px-1.5 py-0.5 rounded-lg text-xs border font-medium ${
                    currentConversation?.status === 'ai_handling' ? 'bg-green-100 text-green-800 border-green-200' :
                    currentConversation?.status === 'staff_handling' || currentConversation?.status === 'assigned' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    currentConversation?.status === 'queued' ? 'bg-green-100 text-green-800 border-green-200' :
                    currentConversation?.status === 'closed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {currentConversation?.status === 'ai_handling' ? 'open' :
                     currentConversation?.status === 'staff_handling' ? 'in-progress' :
                     currentConversation?.status === 'assigned' ? 'in-progress' :
                     currentConversation?.status === 'queued' ? 'open' :
                     currentConversation?.status === 'closed' ? 'resolved' :
                     currentConversation?.status}
                  </button>
                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                    {currentConversation?.priority || 'normal'}
                  </span>
                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20">
                    {currentConversation?.sentiment === 'positive' ? '😊' : currentConversation?.sentiment === 'negative' ? '😟' : currentConversation?.sentiment === 'angry' ? '😡' : '😐'} {currentConversation?.sentiment || 'neutral'}
                  </span>
                </div>
                <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  {currentConversation?.assigned_to === 'ai-agent-001' 
                    ? 'McCarthy AI' 
                    : currentConversation?.assigned_staff_first_name 
                      ? `${currentConversation.assigned_staff_first_name} ${currentConversation.assigned_staff_last_name || ''}`
                      : 'Unassigned'}
                </button>
              </div>

              {/* Middle Row: Customer name and date/time */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900">{currentConversation?.customer_name || currentConversation?.customer_email}</span>
                  <span className="text-xs text-gray-500">
                    {currentConversation?.started_at && new Date(currentConversation.started_at).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Subject and action buttons */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 flex-1 truncate mr-4">
                  <span className="font-medium">Subject:</span> Live Chat Conversation
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Pickup button for queued */}
                  {currentConversation?.status === 'queued' && (
                    <button 
                      onClick={() => pickupMutation.mutate(selectedConversation)}
                      disabled={pickupMutation.isPending}
                      className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Pick Up</span>
                    </button>
                  )}
                  
                  {/* Takeover button for AI handling */}
                  {currentConversation?.status === 'ai_handling' && currentConversation?.assigned_to === 'ai-agent-001' && (
                    <button 
                      onClick={() => takeoverMutation.mutate(selectedConversation)}
                      disabled={takeoverMutation.isPending}
                      className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Take Over</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setShowReassignModal(true)}
                    className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reassign</span>
                  </button>
                  
                  {currentConversation?.status !== 'closed' && (
                    <button 
                      onClick={() => setShowCloseModal(true)}
                      className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Close Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - SEPARATE row like ChatTicketDetailPage */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                  className="h-7 text-xs px-2 py-1 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-1"
                >
                  <User className="w-3 h-3" />
                  <span>Customer Info</span>
                </button>
                <button
                  onClick={() => setShowOrders(!showOrders)}
                  className="h-7 text-xs px-2 py-1 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-1"
                >
                  <Clock className="w-3 h-3" />
                  <span>Order History</span>
                </button>
                <button
                  onClick={() => setShowShopify(!showShopify)}
                  className={`h-7 text-xs px-2 py-1 border rounded-lg hover:opacity-80 transition-colors flex items-center justify-center space-x-1 font-medium ${
                    showShopify 
                      ? 'bg-green-600 text-white border-green-700' 
                      : 'bg-white text-green-700 border-green-300'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Shopify</span>
                </button>
              </div>
              
              {/* Navigation arrows */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePreviousConversation}
                  disabled={!canGoPrevious}
                  className={`p-1 border border-gray-200 rounded ${
                    canGoPrevious 
                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' 
                      : 'text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextConversation}
                  disabled={!canGoNext}
                  className={`p-1 border border-gray-200 rounded ${
                    canGoNext 
                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' 
                      : 'text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container - Scrollable, Threaded style */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {/* Customer Details Panel */}
              {showCustomerDetails && (
                <div className="p-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                  <div className="bg-white rounded-lg p-3 text-xs">
                    <h4 className="font-semibold text-gray-800 mb-2">Customer Profile</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2 font-medium">{currentConversation?.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">VIP:</span>
                        <span className="ml-2 font-medium text-amber-600">No</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 font-medium">{currentConversation?.customer_email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order History Panel */}
              {showOrders && (
                <div className="p-3 bg-green-50 border-b border-green-100 flex-shrink-0">
                  <div className="bg-white rounded-lg p-3">
                    <h4 className="font-semibold text-gray-800 mb-2 text-xs">Order History</h4>
                    <p className="text-xs text-gray-500">Order history will be loaded from Shopify</p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-4 bg-gray-50">
                {[...messages].reverse().map((msg) => {
                  const isCustomer = msg.sender_type === 'customer';
                  const isSystem = msg.sender_type === 'system';
                  const isAI = msg.sender_type === 'ai';
                  
                  if (isSystem) {
                    // Replace internal system markers with user-friendly text
                    const displayContent = msg.content === '__SHOW_CALLBACK_FORM__' 
                      ? 'CALL BACK REQUEST' 
                      : msg.content;
                    
                    return (
                      <div key={msg.id} className="py-3 text-center">
                        <span className="inline-block px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                          {displayContent}
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={msg.id} className={`p-4 rounded-lg ${
                      isCustomer ? 'bg-gray-100' : isAI ? 'bg-purple-50' : 'bg-blue-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCustomer ? 'bg-gray-300' : isAI ? 'bg-purple-200' : 'bg-blue-200'
                        }`}>
                          {isCustomer ? (
                            <User className="w-3 h-3 text-gray-600" />
                          ) : isAI ? (
                            <Sparkles className="w-3 h-3 text-purple-600" />
                          ) : (
                            <User className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium text-sm text-gray-900">
                          {msg.sender_name || (isCustomer ? currentConversation?.customer_name : isAI ? 'McCarthy AI' : 'Staff')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {msg.created_at && formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{msg.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reply Input Area - Same style as ChatTicketDetailPage */}
            {(activeTab === 'staff' || (activeTab === 'ai' && currentConversation?.assigned_to !== 'ai-agent-001')) && 
             currentConversation?.status !== 'closed' && (
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                    rows={3}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || replyMutation.isPending}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors self-end"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            )}
            
            {/* Show "Closed" message for closed chats */}
            {currentConversation?.status === 'closed' && (
              <div className="flex-shrink-0 bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-500">
                <CheckCircle className="w-5 h-5 inline-block mr-2" />
                <span className="text-sm">This chat has been closed</span>
              </div>
            )}

            {/* Staff Notes Section - EXACT MATCH to ChatTicketDetailPage */}
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              {/* Resize Handle for Staff Notes */}
              {showInternalNotes && (
                <div 
                  className="h-1 bg-gray-200 hover:bg-yellow-400 cursor-ns-resize transition-colors flex-shrink-0 relative group"
                  onMouseDown={() => setIsResizingNotes(true)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-1 bg-gray-400 rounded-full group-hover:bg-yellow-500 transition-colors"></div>
                  </div>
                </div>
              )}
              
              {/* Header Bar - Clickable to toggle */}
              <div 
                className="px-4 py-2.5 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 flex items-center gap-2 cursor-pointer hover:from-yellow-100 hover:to-yellow-150 transition-colors"
                onClick={() => setShowInternalNotes(!showInternalNotes)}
              >
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">📝 Staff Notes (Internal Only)</h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-300">Ctrl+Y</span>
              </div>
              
              {/* Expandable Notes Area */}
              {showInternalNotes && (
                <div className="flex flex-col bg-yellow-50" style={{ height: `${staffNotesHeight}px` }}>
                  {/* Existing Notes - Scrollable */}
                  {notes && notes.length > 0 && (
                    <div className="p-4 space-y-2 overflow-y-auto flex-shrink-0" style={{ maxHeight: '60%' }}>
                      {notes.map((note: any) => (
                        <div key={note.id} className="bg-yellow-100 rounded-lg p-3 border border-yellow-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-gray-800">{note.first_name || 'Staff'}</span>
                              <span className="text-xs text-gray-500">
                                {note.created_at && typeof note.created_at === 'string'
                                  ? formatDistanceToNow(new Date(note.created_at.includes('Z') ? note.created_at : note.created_at + 'Z'), { addSuffix: true })
                                  : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                          {/* Attachment Display */}
                          {note.attachment_url && (
                            <div className="mt-2">
                              {note.attachment_type?.startsWith('image/') ? (
                                <a href={getAttachmentUrl(note.attachment_url)} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={getAttachmentUrl(note.attachment_url)} 
                                    alt={note.attachment_name || 'Attachment'} 
                                    className="max-w-xs rounded border border-yellow-300 hover:opacity-90 transition-opacity cursor-pointer"
                                  />
                                  <span className="text-xs text-gray-600 mt-1 block">{note.attachment_name}</span>
                                </a>
                              ) : (
                                <a 
                                  href={getAttachmentUrl(note.attachment_url)} 
                                  download={note.attachment_name || 'file'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50 text-sm"
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span>{note.attachment_name}</span>
                                  <span className="text-xs text-gray-500">({(note.attachment_size / 1024).toFixed(1)} KB)</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Note Input - Fixed at bottom */}
                  <div className="p-4 flex-1 flex flex-col min-h-0 border-t border-yellow-200">
                    {/* Selected Files Display */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-1 bg-white border border-yellow-300 rounded px-2 py-1 text-xs">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          const noteText = e.currentTarget.value.trim()
                          if (noteText && currentConversation) {
                            console.log('[DASHBOARD STAFF NOTES] Submitting note:', noteText)
                            try {
                              // Convert files to base64 if any
                              const attachments = await Promise.all(
                                selectedFiles.map(async (file) => ({
                                  name: file.name,
                                  content: await fileToBase64(file),
                                  type: file.type,
                                  size: file.size
                                }))
                              )
                              
                              await ticketsApi.addNote(currentConversation.ticket_id, noteText, undefined, attachments.length > 0 ? attachments : undefined)
                              setInternalNote('')
                              setSelectedFiles([])
                              refetchNotes()
                              console.log('[DASHBOARD STAFF NOTES] Note saved successfully')
                            } catch (error: any) {
                              console.error('Failed to add note:', error)
                              alert(`Failed to add note: ${error.response?.data?.error || error.message || 'Unknown error'}`)
                            }
                          }
                        }
                      }}
                      placeholder="Add internal notes for other staff members... (Press Enter to save, Shift+Enter for new line)"
                      className="w-full flex-1 border border-yellow-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 resize-none bg-white min-h-0"
                    />
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 self-start flex-shrink-0 flex items-center gap-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      Attach File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Shopify Right Sidebar - Slides in from right */}
      <div className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto ${
        showShopify ? 'w-96' : 'w-0'
      }`}>
        {showShopify && currentConversation && (
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-900">Shopify</h2>
              </div>
              <button 
                onClick={() => setShowShopify(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Loading State */}
            {shopifyLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Loading Shopify data...</div>
              </div>
            )}

            {/* Customer Data */}
            {shopifyData && shopifyData.customer && (
              <>
                {/* Customer Section */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">CUSTOMER</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {shopifyData.customer.firstName} {shopifyData.customer.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{shopifyData.customer.email}</p>
                      {shopifyData.customer.phone && (
                        <p className="text-xs text-gray-500">{shopifyData.customer.phone}</p>
                      )}
                      {shopifyData.customer.isVIP && (
                        <span className="inline-flex items-center mt-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                          ⭐ VIP Customer
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Total Spent:</span>
                        <span className="font-semibold text-indigo-600">
                          ${shopifyData.customer.totalSpent?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Total Orders:</span>
                        <span className="font-semibold text-gray-900">{shopifyData.customer.ordersCount || 0}</span>
                      </div>
                      {shopifyData.customer.lastOrderDate && (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-500">Last Order:</span>
                          <span className="text-gray-900">
                            {new Date(shopifyData.customer.lastOrderDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Section with Navigation */}
                {shopifyData.orders && shopifyData.orders.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">
                        ORDER {currentOrderIndex + 1} OF {shopifyData.orders.length}
                      </h3>
                      {shopifyData.orders.length > 1 && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setCurrentOrderIndex(Math.max(0, currentOrderIndex - 1))}
                            disabled={currentOrderIndex === 0}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous order"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setCurrentOrderIndex(Math.min(shopifyData.orders.length - 1, currentOrderIndex + 1))}
                            disabled={currentOrderIndex === shopifyData.orders.length - 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next order"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Order {shopifyData.orders[currentOrderIndex].orderNumber}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            shopifyData.orders[currentOrderIndex].fulfillmentStatus === 'fulfilled' 
                              ? 'bg-green-100 text-green-800'
                              : shopifyData.orders[currentOrderIndex].fulfillmentStatus === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {shopifyData.orders[currentOrderIndex].fulfillmentStatus || 'Unfulfilled'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Total: <span className="font-semibold text-gray-900">
                              ${shopifyData.orders[currentOrderIndex].totalPrice?.toFixed(2)} {shopifyData.orders[currentOrderIndex].currency}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900">
                            {new Date(shopifyData.orders[currentOrderIndex].createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Payment:</span>
                          <span className={`font-medium ${
                            shopifyData.orders[currentOrderIndex].financialStatus === 'paid' 
                              ? 'text-green-600' 
                              : 'text-yellow-600'
                          }`}>
                            {shopifyData.orders[currentOrderIndex].financialStatus || 'Pending'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Line Items - Clickable/Expandable */}
                      {shopifyData.orders[currentOrderIndex].lineItems && shopifyData.orders[currentOrderIndex].lineItems.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Items:</p>
                          <div className="space-y-2">
                            {shopifyData.orders[currentOrderIndex].lineItems.map((item: any, idx: number) => (
                              <div key={item.id || idx} className="border border-gray-200 rounded-md overflow-hidden">
                                <button
                                  onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                  className="w-full text-left px-2 py-1.5 hover:bg-gray-50 transition-colors flex justify-between items-center"
                                >
                                  <span className="text-xs text-gray-700 truncate flex-1">{item.title}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">x{item.quantity}</span>
                                    <svg 
                                      className={`w-3 h-3 text-gray-400 transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>
                                
                                {/* Expanded Details */}
                                {expandedItemId === item.id && (
                                  <div className="px-2 py-2 bg-gray-50 border-t border-gray-200 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Price:</span>
                                      <span className="text-gray-900 font-medium">${item.price?.toFixed(2)}</span>
                                    </div>
                                    {item.sku && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">SKU:</span>
                                        <span className="text-gray-900 font-mono">{item.sku}</span>
                                      </div>
                                    )}
                                    {item.variantTitle && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Variant:</span>
                                        <span className="text-gray-900">{item.variantTitle}</span>
                                      </div>
                                    )}
                                    
                                    {/* Custom Attributes */}
                                    {item.customAttributes && item.customAttributes.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-gray-500 font-medium mb-1.5">Product Details:</p>
                                        {item.customAttributes.map((attr: any, attrIdx: number) => (
                                          <div key={attrIdx} className="flex justify-between py-0.5">
                                            <span className="text-gray-500">{attr.key.replace('_', '')}:</span>
                                            {attr.key.includes('Link') || attr.key.includes('link') ? (
                                              <a 
                                                href={attr.value} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 underline truncate max-w-[180px]"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                View →
                                              </a>
                                            ) : (
                                              <span className="text-gray-900 font-mono text-right truncate max-w-[180px]">
                                                {attr.value}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">ORDERS</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">No orders found</p>
                    </div>
                  </div>
                )}

                {/* Fulfillment & Tracking Section */}
                {shopifyData.orders && shopifyData.orders[currentOrderIndex]?.trackingNumber && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">FULFILLMENT & TRACKING</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tracking:</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {shopifyData.orders[currentOrderIndex].trackingNumber}
                        </p>
                        {shopifyData.orders[currentOrderIndex].trackingCompany && (
                          <p className="text-xs text-gray-500 mt-1">
                            Carrier: <span className="text-gray-900">{shopifyData.orders[currentOrderIndex].trackingCompany}</span>
                          </p>
                        )}
                      </div>
                      {shopifyData.orders[currentOrderIndex].trackingUrl && (
                        <a 
                          href={shopifyData.orders[currentOrderIndex].trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Track Package →
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        )}
      </div>

      {/* Close Chat Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Close Chat</h3>
            <p className="text-sm text-gray-600 mb-4">How would you like to close this chat?</p>
            
            <div className="space-y-3">
              <button
                onClick={() => closeMutation.mutate({ 
                  id: selectedConversation!, 
                  resolutionType: 'resolved' 
                })}
                disabled={closeMutation.isPending}
                className="w-full flex items-center gap-3 p-3 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Mark as Resolved</p>
                  <p className="text-xs text-gray-500">Customer's issue was solved</p>
                </div>
              </button>
              
              <button
                onClick={() => closeMutation.mutate({ 
                  id: selectedConversation!, 
                  resolutionType: 'closed' 
                })}
                disabled={closeMutation.isPending}
                className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Close as Inactive</p>
                  <p className="text-xs text-gray-500">Customer stopped responding</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowCloseModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reassign Chat Modal - Same style as ChatTicketDetailPage */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Reassign Chat</h3>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Reassign this chat to another staff member:
              </p>

              {/* Only one online warning */}
              {staffList.filter(s => s.availability_status === 'online').length === 1 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ℹ️ You're the only staff member online
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {/* McCarthy AI option */}
                <label
                  className={`flex items-center p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                    reassignTo === 'ai-agent-001'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="staff"
                    value="ai-agent-001"
                    checked={reassignTo === 'ai-agent-001'}
                    onChange={(e) => setReassignTo(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 mr-3"
                  />
                  <div className="w-2 h-2 rounded-full mr-3 bg-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      McCarthy AI
                    </p>
                    <p className="text-xs text-gray-500">Return to McCarthy AI</p>
                  </div>
                </label>

                {/* Staff members */}
                {staffList
                  .filter(s => s.id !== 'ai-agent-001')
                  .map((staff) => (
                    <label
                      key={staff.id}
                      className={`flex items-center p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                        reassignTo === staff.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="staff"
                        value={staff.id}
                        checked={reassignTo === staff.id}
                        onChange={(e) => setReassignTo(e.target.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 mr-3"
                      />
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        staff.availability_status === 'online' ? 'bg-green-500' : 
                        staff.availability_status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{staff.first_name} {staff.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{staff.availability_status || 'Offline'}</p>
                      </div>
                    </label>
                  ))
                }
              </div>

              {/* Reason field */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g., Sales inquiry, needs technical support..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignTo('');
                  setReassignReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reassignTo && selectedConversation) {
                    reassignMutation.mutate({
                      id: selectedConversation,
                      assignTo: reassignTo,
                      reason: reassignReason || undefined
                    });
                  }
                }}
                disabled={!reassignTo || reassignMutation.isPending}
                className="flex-1 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
