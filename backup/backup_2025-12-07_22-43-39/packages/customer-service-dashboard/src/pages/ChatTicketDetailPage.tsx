import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { ticketsApi, api } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { User, Package, ShoppingBag, ChevronLeft, ChevronRight, Sparkles, Send, UserPlus, CheckCircle, XCircle, Paperclip, X, Phone } from 'lucide-react'
// import { useAuthStore } from '../store/authStore'
// Using inline chat reassign modal instead of ReassignModal component

const statusColors = {
  open: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'ai_handling': 'bg-purple-100 text-purple-800 border-purple-200',
  'staff_handling': 'bg-blue-100 text-blue-800 border-blue-200',
  'assigned': 'bg-blue-100 text-blue-800 border-blue-200',
  'queued': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-gray-100 text-gray-800 border-gray-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  snoozed: 'bg-purple-100 text-purple-800 border-purple-200',
}

const priorityColors = {
  low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  normal: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  urgent: 'bg-red-100 text-red-800 ring-red-700/30',
}

const sentimentColors = {
  positive: 'bg-green-50 text-green-700 ring-green-600/20',
  neutral: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  negative: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  angry: 'bg-red-50 text-red-700 ring-red-600/20',
}

const sentimentIcons = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
  angry: '😡',
}

const staffNames: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'John Hutchison',
  '00000000-0000-0000-0000-000000000002': 'Ted Smith',
  '00000000-0000-0000-0000-000000000003': 'Sam Johnson',
  'ai-agent-001': 'McCarthy AI',
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'staff' | 'ai' | 'system';
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  availability_status: string;
}

const chatApi = {
  getConversationByTicket: async (ticketId: string) => {
    const response = await api.get(`/api/chat/conversation/by-ticket/${ticketId}`);
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

// Helper function to get full attachment URL
const getAttachmentUrl = (attachmentUrl: string | null | undefined): string => {
  if (!attachmentUrl) return '';
  if (attachmentUrl.startsWith('data:') || attachmentUrl.startsWith('http')) {
    return attachmentUrl;
  }
  return `https://dartmouth-os-worker.dartmouth.workers.dev/api/attachments/${attachmentUrl}`;
};

export default function ChatTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // const user = useAuthStore((state) => state.user) // May be used later for permissions
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [showOrders, setShowOrders] = useState(false)
  const [showShopify, setShowShopify] = useState(false)
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [staffResponse, setStaffResponse] = useState('')
  const [showInternalNotes, setShowInternalNotes] = useState(false)
  const [internalNote, setInternalNote] = useState('')
  const [staffNotesHeight, setStaffNotesHeight] = useState(250)
  const [isResizingNotes, setIsResizingNotes] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showChatReassignModal, setShowChatReassignModal] = useState(false)
  const [reassignTo, setReassignTo] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch ticket data
  const { data: ticketData, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await ticketsApi.get(id!)
      return response.data
    },
    enabled: !!id,
  })

  // Fetch conversation by ticket ID
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['chat-conversation-by-ticket', id],
    queryFn: async () => {
      const result = await chatApi.getConversationByTicket(id!)
      if (result.conversation) {
        // Get full conversation with messages
        const fullConv = await chatApi.getConversation(result.conversation.id)
        return fullConv
      }
      return null
    },
    enabled: !!id,
    refetchInterval: 3000, // Poll for new messages
  })

  // Fetch all tickets for navigation
  const { data: allTicketsData } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await ticketsApi.list()
      return response.data
    },
  })

  // Fetch staff list for reassignment
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => chatApi.getStaffList(),
    enabled: showChatReassignModal,
  })
  const staffList: StaffMember[] = staffData?.staff || []

  // Fetch notes for this ticket
  const { data: notesData, refetch: refetchNotes } = useQuery({
    queryKey: ['ticket-notes', id],
    queryFn: async () => {
      const response = await ticketsApi.get(id!)
      return response.data
    },
    enabled: !!id,
  })

  const ticket = ticketData?.ticket
  const conversation = conversationData?.conversation
  const messages: ChatMessage[] = conversationData?.messages || []
  const notes = notesData?.notes || []

  // Fetch Shopify data for the ticket
  const { data: shopifyData, isLoading: shopifyLoading } = useQuery({
    queryKey: ['shopify-data', ticket?.customer_email],
    queryFn: async () => {
      if (!ticket?.customer_email) return null;
      const response = await api.get(`/api/shopify/ticket-data?email=${encodeURIComponent(ticket.customer_email)}`);
      return response.data;
    },
    enabled: !!ticket?.customer_email && showShopify,
  });
  let allTickets = allTicketsData?.tickets || []

  // Get the current filter from URL params
  const filter = searchParams.get('filter')
  const fromAssignment = searchParams.get('from')
  
  // Filter tickets based on the context the user came from
  if (filter === 'my' || fromAssignment === 'my') {
    allTickets = allTickets.filter((t: any) => t.assigned_to === '00000000-0000-0000-0000-000000000001')
  } else if (filter === 'vip' || fromAssignment === 'vip') {
    allTickets = allTickets.filter((t: any) => t.vip === 1)
  } else if (fromAssignment) {
    allTickets = allTickets.filter((t: any) => t.assigned_to === fromAssignment)
  }
  
  // Find current ticket index in filtered list
  const currentIndex = allTickets.findIndex((t: any) => t.ticket_id === id)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allTickets.length - 1

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevTicket = allTickets[currentIndex - 1]
      const params = new URLSearchParams(searchParams)
      if (prevTicket.channel === 'chat') {
        navigate(`/chat-ticket/${prevTicket.ticket_id}?${params.toString()}`)
      } else {
        navigate(`/tickets/${prevTicket.ticket_id}?${params.toString()}`)
      }
    }
  }
  
  const handleNext = () => {
    if (hasNext) {
      const nextTicket = allTickets[currentIndex + 1]
      const params = new URLSearchParams(searchParams)
      if (nextTicket.channel === 'chat') {
        navigate(`/chat-ticket/${nextTicket.ticket_id}?${params.toString()}`)
      } else {
        navigate(`/tickets/${nextTicket.ticket_id}?${params.toString()}`)
      }
    }
  }

  // Mutations
  const takeoverMutation = useMutation({
    mutationFn: () => chatApi.takeoverConversation(conversation!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-by-ticket'] })
    },
  })

  const pickupMutation = useMutation({
    mutationFn: () => chatApi.pickupFromQueue(conversation!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-by-ticket'] })
    },
  })

  const replyMutation = useMutation({
    mutationFn: (message: string) => chatApi.replyToConversation(conversation!.id, message),
    onSuccess: () => {
      setStaffResponse('')
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-by-ticket'] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: (resolutionType: 'resolved' | 'closed') => chatApi.closeConversation(conversation!.id, resolutionType),
    onSuccess: () => {
      setShowCloseModal(false)
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-by-ticket'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const reassignMutation = useMutation({
    mutationFn: ({ assignTo, reason }: { assignTo: string; reason?: string }) => 
      chatApi.reassignConversation(conversation!.id, assignTo, reason),
    onSuccess: () => {
      setShowChatReassignModal(false)
      setReassignTo('')
      setReassignReason('')
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-by-ticket'] })
    },
  })

  const handleSendReply = () => {
    if (!staffResponse.trim() || !conversation) return
    replyMutation.mutate(staffResponse.trim())
  }

  // Reset order index when ticket changes or Shopify panel opens
  useEffect(() => {
    setCurrentOrderIndex(0);
  }, [id, showShopify]);

  // Handle adding internal notes - Enter key to submit
  // Keyboard shortcut: Ctrl+Y for Staff Notes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Y (Cmd+Y on Mac) to toggle Staff Notes
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        setShowInternalNotes(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle file selection for staff notes
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Validate file sizes
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        e.target.value = ''
        return
      }
    }
    setSelectedFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  // Remove a selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

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

  const isLoading = ticketLoading || conversationLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Ticket not found</div>
      </div>
    )
  }

  const canReply = conversation && 
    (conversation.status === 'staff_handling' || conversation.status === 'assigned' || 
     (conversation.status === 'ai_handling' && conversation.assigned_to !== 'ai-agent-001'))

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
          {/* Top Row: Back button, Ticket number, and badges */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Link to="/tickets" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                {ticket.subject?.toLowerCase().includes('callback request') ? (
                  <Phone className="w-4 h-4 text-red-600 fill-current" />
                ) : (
                  <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                  </svg>
                )}
                <h1 className="text-base font-semibold text-gray-900">{ticket.ticket_number}</h1>
              </div>
              {ticket.vip === 1 && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs border border-yellow-200 font-medium">
                  ⭐ VIP
                </span>
              )}
              <button
                className={`px-1.5 py-0.5 rounded-lg text-xs border font-medium ${
                  statusColors['in-progress' as keyof typeof statusColors] || statusColors.open
                }`}
              >
                {conversation?.status === 'ai_handling' ? 'open' :
                 conversation?.status === 'staff_handling' ? 'in-progress' :
                 conversation?.status === 'assigned' ? 'in-progress' :
                 conversation?.status === 'queued' ? 'open' :
                 conversation?.status === 'closed' ? 'resolved' :
                 ticket.status}
              </button>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${priorityColors[ticket.priority as keyof typeof priorityColors] || priorityColors.normal}`}>
                {ticket.priority}
              </span>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${sentimentColors[ticket.sentiment as keyof typeof sentimentColors] || sentimentColors.neutral}`}>
                {sentimentIcons[ticket.sentiment as keyof typeof sentimentIcons] || '😐'} {ticket.sentiment || 'neutral'}
              </span>
            </div>
            <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              {conversation?.assigned_to === 'ai-agent-001' 
                ? 'McCarthy AI' 
                : conversation?.assigned_staff_first_name 
                  ? `${conversation.assigned_staff_first_name} ${conversation.assigned_staff_last_name || ''}`
                  : ticket.assigned_to ? staffNames[ticket.assigned_to] || ticket.assigned_to : 'Unassigned'}
            </button>
          </div>

          {/* Middle Row: Customer name and date/time */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">{ticket.customer_name || ticket.customer_email}</span>
              <span className="text-xs text-gray-500">
                {new Date(ticket.created_at).toLocaleString('en-US', { 
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
              <span className="font-medium">Subject:</span> {ticket.subject || 'Live Chat Conversation'}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Pickup button for queued */}
              {conversation?.status === 'queued' && (
                <button 
                  onClick={() => pickupMutation.mutate()}
                  disabled={pickupMutation.isPending}
                  className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Pick Up</span>
                </button>
              )}
              
              {/* Takeover button for AI handling */}
              {conversation?.status === 'ai_handling' && conversation?.assigned_to === 'ai-agent-001' && (
                <button 
                  onClick={() => takeoverMutation.mutate()}
                  disabled={takeoverMutation.isPending}
                  className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Take Over</span>
                </button>
              )}
              
              <button 
                onClick={() => setShowChatReassignModal(true)}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reassign</span>
              </button>
              
              {conversation?.status !== 'closed' && (
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

        {/* Action Buttons */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
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
              <Package className="w-3 h-3" />
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
              <ShoppingBag className="w-3 h-3" />
              <span>Shopify</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="h-7 text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={!hasNext}
              className="h-7 text-xs px-2 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages Container - Scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {/* Customer Details Panel */}
          {showCustomerDetails && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="bg-white rounded-lg p-3 text-xs">
                <h4 className="font-semibold text-gray-800 mb-2">Customer Profile</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{ticket.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">VIP:</span>
                    <span className="ml-2 font-medium text-amber-600">{ticket.vip ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{ticket.customer_email}</span>
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

          {/* Messages - Threaded style like Email */}
          <div className="p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                  <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                </svg>
                <p>No messages yet</p>
              </div>
            ) : (
              [...messages].reverse().map((msg) => {
                const isCustomer = msg.sender_type === 'customer';
                const isSystem = msg.sender_type === 'system';
                const isAI = msg.sender_type === 'ai';
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center py-2">
                      <span className="inline-block px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                        {msg.content}
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
                        {isCustomer 
                          ? (msg.sender_name || ticket.customer_name || 'Customer')
                          : isAI ? 'McCarthy AI' : (msg.sender_name ? msg.sender_name.split(' ')[0] : 'Staff')
                        }
                      </span>
                      <span className="text-xs text-gray-400">
                        {msg.created_at && typeof msg.created_at === 'string'
                          ? formatDistanceToNow(new Date(msg.created_at.includes('Z') ? msg.created_at : msg.created_at + 'Z'), { addSuffix: true })
                          : ''}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{msg.content}</div>
                    {/* Attachment Display */}
                    {msg.attachment_url && (
                      <div className="mt-2 ml-8">
                        {msg.attachment_type?.startsWith('image/') ? (
                          <a href={getAttachmentUrl(msg.attachment_url)} target="_blank" rel="noopener noreferrer" className="block">
                            <img 
                              src={getAttachmentUrl(msg.attachment_url)} 
                              alt={msg.attachment_name || 'Attachment'} 
                              className="max-w-md rounded border border-gray-300 hover:opacity-90 transition-opacity cursor-pointer"
                            />
                            <span className="text-xs text-gray-600 mt-1 block">{msg.attachment_name}</span>
                          </a>
                        ) : (
                          <a 
                            href={getAttachmentUrl(msg.attachment_url)} 
                            download={msg.attachment_name || 'file'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span>{msg.attachment_name}</span>
                            <span className="text-xs text-gray-500">({((msg.attachment_size || 0) / 1024).toFixed(1)} KB)</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Simple Chat Response Area - Always visible at bottom */}
        {canReply && (
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={staffResponse}
                onChange={(e) => setStaffResponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                rows={3}
              />
              <button
                onClick={handleSendReply}
                disabled={!staffResponse.trim() || replyMutation.isPending}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors self-end"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        )}
        
        {/* Message when can't reply */}
        {!canReply && conversation?.status !== 'closed' && (
          <div className="flex-shrink-0 bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-500">
            <p className="text-sm">
              {conversation?.status === 'ai_handling' 
                ? 'AI is handling this chat. Click "Take Over" to respond.' 
                : conversation?.status === 'queued'
                ? 'This chat is in queue. Click "Pick Up" to respond.'
                : 'Unable to respond to this chat.'}
            </p>
          </div>
        )}
        
        {/* Closed message */}
        {conversation?.status === 'closed' && (
          <div className="flex-shrink-0 bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-500">
            <CheckCircle className="w-5 h-5 inline-block mr-2" />
            <span className="text-sm">This chat has been closed</span>
          </div>
        )}

        {/* Internal Notes Section - Same as Email Ticket */}
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
          
          {/* Header Bar */}
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
                  data-test="chat-staff-notes-textarea"
                  value={internalNote}
                  onChange={(e) => {
                    console.log('[CHAT STAFF NOTES] onChange fired:', e.target.value)
                    setInternalNote(e.target.value)
                  }}
                  onKeyDown={async (e) => {
                    console.log('[CHAT STAFF NOTES] onKeyDown fired - key:', e.key)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const noteText = e.currentTarget.value.trim()
                      if (noteText && ticket) {
                        console.log('[CHAT STAFF NOTES] Submitting note:', noteText)
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
                          
                          await ticketsApi.addNote(ticket.ticket_id, noteText, undefined, attachments.length > 0 ? attachments : undefined)
                          setInternalNote('')
                          setSelectedFiles([])
                          refetchNotes()
                        } catch (error: any) {
                          console.error('Failed to add note:', error)
                          alert(`Failed to add note: ${error.response?.data?.error || error.message || 'Unknown error'}`)
                        }
                      } else {
                        console.log('[CHAT STAFF NOTES] Cannot submit - noteText:', noteText, 'ticket:', !!ticket)
                      }
                    }
                  }}
                  onFocus={() => console.log('[CHAT STAFF NOTES] onFocus fired')}
                  onBlur={() => console.log('[CHAT STAFF NOTES] onBlur fired')}
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
      </div>

      {/* Shopify Right Sidebar - Slides in from right */}
      <div className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto ${
        showShopify ? 'w-96' : 'w-0'
      }`}>
        {showShopify && (
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-900">Shopify</h2>
              </div>
              <button 
                onClick={() => setShowShopify(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                onClick={() => closeMutation.mutate('resolved')}
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
                onClick={() => closeMutation.mutate('closed')}
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

      {/* Chat Reassign Modal - Same style as email reassign */}
      {showChatReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Reassign Chat</h3>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Reassign chat #{ticket?.ticket_number} to another staff member:
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
                    <p className="text-xs text-gray-500">Return to AI handling</p>
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
                  setShowChatReassignModal(false)
                  setReassignTo('')
                  setReassignReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reassignTo) {
                    reassignMutation.mutate({
                      assignTo: reassignTo,
                      reason: reassignReason || undefined
                    })
                  }
                }}
                disabled={!reassignTo || reassignMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Reassign Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

