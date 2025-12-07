import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ticketsApi, api } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { Search, X, GitMerge, Trash2 } from 'lucide-react'
import ReassignModal from '../components/ReassignModal'
import { useAuthStore } from '../store/authStore'
// import PlatformSelect from '../components/PlatformSelect'

const statusColors = {
  open: 'bg-green-50 text-green-700 ring-green-600/20',
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  'in-progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  resolved: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  closed: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  snoozed: 'bg-purple-50 text-purple-700 ring-purple-600/20',
}

// Platform icon component - clean, consistent SVG icons
const PlatformIcon = ({ platform, className = "w-4 h-4" }: { platform?: string; className?: string }) => {
  switch (platform) {
    case 'chat':
      // Chat bubble icon with lines - consistent indigo color
      return (
        <svg className={`${className} text-indigo-500`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
      );
    case 'phone':
      // Phone icon
      return (
        <svg className={`${className} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    case 'whatsapp':
      // WhatsApp icon
      return (
        <svg className={`${className} text-green-600`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case 'facebook':
      // Facebook Messenger icon
      return (
        <svg className={`${className} text-blue-600`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.438 5.503 3.686 7.2V22l3.357-1.844c.896.248 1.845.383 2.827.383 5.523 0 10-4.145 10-9.257S17.523 2 12 2zm.994 12.468l-2.547-2.717-4.973 2.717 5.47-5.806 2.611 2.717 4.908-2.717-5.47 5.806z"/>
        </svg>
      );
    case 'instagram':
      // Instagram icon
      return (
        <svg className={`${className} text-pink-500`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case 'email':
    default:
      // Email envelope icon - matching the style used elsewhere
      return (
        <svg className={`${className} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
};

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
  '00000000-0000-0000-0000-000000000004': 'Gaille Hutchison',
  'ai-agent-001': 'McCarthy AI',
}

// Format ticket number to TKT-173 format (remove leading zeros)
const formatTicketNumber = (ticketNumber: string): string => {
  const match = ticketNumber.match(/\d+/);
  if (!match) return ticketNumber;
  const num = parseInt(match[0], 10); // This removes leading zeros
  return `TKT-${num}`;
};

export default function TicketsPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [vipFilter, setVipFilter] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle URL params for filtering - sidebar clicks RESET all filters and set only that one
  useEffect(() => {
    const filter = searchParams.get('filter')
    const assigned = searchParams.get('assigned')
    const status = searchParams.get('status')
    
    // Reset ALL filters first when any sidebar item is clicked
    const resetAllFilters = () => {
      setStatusFilter('all')
      setAssignmentFilter('all')
      setPriorityFilter('all')
      setSentimentFilter('all')
      setChannelFilter('all')
      setTimeFilter('all')
      setVipFilter(false)
    }
    
    // Handle status from sidebar (Open, Snoozed, Resolved)
    if (status === 'open') {
      resetAllFilters()
      setStatusFilter('open-in-progress')
    } else if (status === 'resolved') {
      resetAllFilters()
      setStatusFilter('resolved')
    } else if (status === 'snoozed') {
      resetAllFilters()
      setStatusFilter('snoozed')
    }
    // Handle assignment filters from sidebar
    else if (filter === 'my') {
      resetAllFilters()
      setAssignmentFilter(user?.id || '00000000-0000-0000-0000-000000000001')
    } else if (filter === 'vip') {
      resetAllFilters()
      setVipFilter(true)
    } else if (filter === 'unassigned') {
      resetAllFilters()
      setAssignmentFilter('unassigned')
    } else if (filter === 'all-escalated') {
      resetAllFilters()
      setAssignmentFilter('all-escalated')
    } else if (filter === 'all-assigned') {
      resetAllFilters()
      setAssignmentFilter('all-assigned')
    } else if (assigned === 'ted') {
      resetAllFilters()
      setAssignmentFilter('00000000-0000-0000-0000-000000000002')
    } else if (assigned === 'sam') {
      resetAllFilters()
      setAssignmentFilter('00000000-0000-0000-0000-000000000003')
    } else if (assigned) {
      resetAllFilters()
      setAssignmentFilter(assigned)
    } else if (!filter && !status && !assigned) {
      // "All Tickets" clicked - reset everything
      resetAllFilters()
    }
  }, [searchParams, user?.id])

  // Handle search parameter from URL (e.g., from @ticket links)
  useEffect(() => {
    const search = searchParams.get('search')
    if (search) {
      setSearchQuery(search)
      setSearchOpen(true)
    }
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['tickets-all'], // Fetch all tickets once, filter client-side
    queryFn: async () => {
      const params: any = { limit: 1000 } // Get all tickets
      const response = await ticketsApi.list(params)
      return response.data.tickets
    },
    refetchInterval: 30000,
  })

  // Auto-navigate to ticket if search yields exactly one result
  useEffect(() => {
    if (searchQuery.trim() && data && data.length > 0) {
      const query = searchQuery.trim()
      
      // Try to match ticket number - handle both "TKT-254" and "254" formats
      let matchingTickets = data.filter((t: any) => {
        if (!t.ticket_number) return false
        
        const ticketNum = t.ticket_number.toLowerCase()
        const searchLower = query.toLowerCase()
        
        // Direct match
        if (ticketNum === searchLower) return true
        
        // Match just the number part (e.g., "254" matches "TKT-000254")
        const numOnly = t.ticket_number.replace(/\D/g, '').replace(/^0+/, '')
        const searchNumOnly = query.replace(/\D/g, '').replace(/^0+/, '')
        if (numOnly === searchNumOnly && searchNumOnly.length > 0) return true
        
        // Partial match
        if (ticketNum.includes(searchLower)) return true
        
        return false
      })
      
      // If exactly one ticket found and it has a valid ID, auto-navigate
      if (matchingTickets.length === 1 && matchingTickets[0].id) {
        const ticket = matchingTickets[0]
        console.log('[TicketsPage] Auto-navigating to ticket:', ticket.ticket_number, ticket.id)
        // Use setTimeout to avoid navigation during render
        setTimeout(() => {
          window.location.href = `/tickets/${ticket.id}`
        }, 1000)
      } else if (matchingTickets.length === 0) {
        console.log('[TicketsPage] No tickets found for search:', query)
      } else if (matchingTickets.length > 1) {
        console.log('[TicketsPage] Multiple tickets found:', matchingTickets.length, '- showing list')
      }
    }
  }, [searchQuery, data])

  // Fetch staff list for dropdown
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const response = await api.get('/api/staff')
      return response.data
    },
    staleTime: 60000, // Cache for 1 minute
  })
  const staffList: { id: string; first_name: string; last_name: string }[] = staffData?.staff || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tickets...</div>
      </div>
    )
  }

  let tickets = data || []
  
  // SIMPLE FILTERING: All filters work together, sidebar just sets dropdown values
  
  // 1. Status filter
  if (statusFilter === 'open-in-progress') {
    tickets = tickets.filter((t: any) => 
      t.status === 'open' || t.status === 'in-progress' || t.status === 'pending'
    )
  } else if (statusFilter === 'snoozed') {
    tickets = tickets.filter((t: any) => t.status === 'snoozed')
  } else if (statusFilter === 'resolved') {
    tickets = tickets.filter((t: any) => t.status === 'resolved' || t.status === 'closed')
  } else {
    // 'all' - exclude resolved/closed by default for cleaner view
    tickets = tickets.filter((t: any) => t.status !== 'resolved' && t.status !== 'closed')
  }
  
  // 2. Assignment filter
  if (assignmentFilter !== 'all') {
    if (assignmentFilter === 'unassigned') {
      tickets = tickets.filter((t: any) => !t.assigned_to || t.assigned_to === null)
    } else if (assignmentFilter === 'all-assigned') {
      tickets = tickets.filter((t: any) => t.assigned_to && t.assigned_to !== null)
    } else if (assignmentFilter === 'all-escalated') {
      tickets = tickets.filter((t: any) => t.has_escalation === 1)
    } else if (assignmentFilter === 'resolved') {
      // Override status filter for resolved view from dropdown
      tickets = (data || []).filter((t: any) => t.status === 'resolved' || t.status === 'closed')
    } else {
      // Filter by specific staff ID (including ai-agent-001 for McCarthy AI, or current user)
      tickets = tickets.filter((t: any) => 
        t.assigned_to === assignmentFilter || t.is_escalated_to_me === 1
      )
    }
  }
  
  // 3. VIP filter
  if (vipFilter) {
    tickets = tickets.filter((t: any) => t.vip === 1)
  }
  
  // 4. Priority filter
  if (priorityFilter !== 'all') {
    tickets = tickets.filter((t: any) => t.priority === priorityFilter)
  }
  
  // 5. Sentiment filter
  if (sentimentFilter !== 'all') {
    tickets = tickets.filter((t: any) => t.sentiment === sentimentFilter)
  }
  
  // 6. Channel/Platform filter
  if (channelFilter !== 'all') {
    tickets = tickets.filter((t: any) => t.channel === channelFilter)
  }
  
  // Apply time filter
  if (timeFilter !== 'all') {
    const now = new Date()
    let cutoffDate: Date
    
    if (timeFilter === 'today') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timeFilter === 'week') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeFilter === 'month') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else {
      cutoffDate = new Date(0) // All time
    }
    
    tickets = tickets.filter((t: any) => {
      const ticketDate = new Date(t.created_at)
      return ticketDate >= cutoffDate
    })
  }

  // STEP 4: Apply search filter (always applies on top of other filters)
  if (searchQuery.trim()) {
    const query = searchQuery.trim()
    
    // Check if it's a ticket number search (e.g., "254", "TKT-254", "112, 119, 122")
    const isTicketNumberSearch = /^(TKT-)?[\d,\s-]+$/.test(query)
    
    if (isTicketNumberSearch) {
      // Parse ticket numbers (handle comma-separated and single tickets)
      const ticketNumbers = query
        .replace(/TKT-/gi, '') // Remove TKT- prefix
        .split(',')
        .map(n => n.trim().replace(/\D/g, '')) // Remove non-digits
        .filter(n => n.length > 0)
      
      tickets = tickets.filter((t: any) => {
        // Extract just the number part from ticket_number (e.g., "TKT-000112" -> "112")
        const ticketNum = t.ticket_number?.replace(/\D/g, '').replace(/^0+/, '') || ''
        return ticketNumbers.some(searchNum => {
          const cleanSearchNum = searchNum.replace(/^0+/, '')
          return ticketNum === cleanSearchNum || 
                 ticketNum.endsWith(cleanSearchNum) ||
                 t.ticket_number?.toLowerCase().includes(searchNum.toLowerCase())
        })
      })
    } else {
      // Regular text search
      const queryLower = query.toLowerCase()
      tickets = tickets.filter((t: any) => 
        t.ticket_number?.toLowerCase().includes(queryLower) ||
        t.customer_name?.toLowerCase().includes(queryLower) ||
        t.customer_email?.toLowerCase().includes(queryLower) ||
        t.subject?.toLowerCase().includes(queryLower) ||
        t.description?.toLowerCase().includes(queryLower)
      )
    }
  }

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort tickets based on selected column and direction
  tickets = tickets.sort((a: any, b: any) => {
    // Sort by selected column (no special treatment for snoozed - use filters instead)
    let aValue = a[sortColumn]
    let bValue = b[sortColumn]
    
    // Handle special cases
    if (sortColumn === 'created_at') {
      aValue = new Date(a.created_at).getTime()
      bValue = new Date(b.created_at).getTime()
    } else if (sortColumn === 'customer_name') {
      aValue = a.customer_name?.toLowerCase() || ''
      bValue = b.customer_name?.toLowerCase() || ''
    } else if (sortColumn === 'subject') {
      aValue = a.subject?.toLowerCase() || ''
      bValue = b.subject?.toLowerCase() || ''
    } else if (sortColumn === 'assigned_to') {
      aValue = staffNames[a.assigned_to] || 'Unassigned'
      bValue = staffNames[b.assigned_to] || 'Unassigned'
    }
    
    // Apply sort direction
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  // Get queue title based on current filter
  const getQueueTitle = () => {
    // Check assignment filter first
    if (assignmentFilter === user?.id) return 'My Tickets'
    if (assignmentFilter === 'unassigned') return 'Unassigned'
    if (assignmentFilter === 'all-escalated') return '⚠️ All Escalated Tickets'
    if (assignmentFilter === 'all-assigned') return 'All Assigned'
    if (assignmentFilter === 'ai-agent-001') return 'McCarthy AI'
    
    // Check if it's a staff member
    const staffMember = staffList.find(s => s.id === assignmentFilter)
    if (staffMember) return `${staffMember.first_name} ${staffMember.last_name}`
    
    // Check status filter
    if (statusFilter === 'snoozed') return 'Snoozed'
    if (statusFilter === 'resolved') return 'Resolved'
    if (statusFilter === 'open-in-progress') return 'Open (in-progress)'
    
    // Check VIP filter
    if (vipFilter) return 'VIP'
    
    return 'All Tickets'
  }

  return (
    <div className="p-6">
      {/* Sticky Header + Filters */}
      <div className="sticky top-0 z-10 bg-white pb-4 -mx-6 px-6 -mt-6 pt-6 border-b border-gray-200 mb-4">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900 flex items-center gap-3">
              {getQueueTitle()}
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {tickets.length}
              </span>
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-1.5 rounded-lg transition-colors ${searchOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title="Search tickets"
              >
                <Search className="w-5 h-5" />
              </button>
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all customer service tickets including their status, priority, and assignment.
            </p>
          </div>
        </div>

        {/* Filters - Order: All Tickets, All Platforms, All Statuses, All Priorities, All Sentiments, All Time */}
        <div className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* 1. All Tickets (Assignment Filter) */}
        <select 
          value={assignmentFilter}
          onChange={(e) => {
            const value = e.target.value
            setAssignmentFilter(value)
            setVipFilter(value === 'vip')
          }}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Tickets</option>
          <option value={user?.id || ''}>My Tickets</option>
          {/* Dynamic staff list */}
          {staffList
            .filter(staff => staff.id !== 'ai-agent-001' && staff.id !== user?.id)
            .map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name}
              </option>
            ))
          }
          <option value="ai-agent-001">McCarthy AI</option>
          <option value="all-assigned">Assigned All</option>
          <option value="unassigned">Unassigned</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* 2. All Platforms */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Platforms</option>
          <option value="email">📧 Email</option>
          <option value="chat">💬 Live Chat</option>
          <option value="whatsapp">📱 WhatsApp</option>
          <option value="instagram">📸 Instagram</option>
          <option value="facebook">💭 Messenger</option>
          <option value="phone">📞 Phone</option>
        </select>

        {/* 3. All Statuses */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Statuses</option>
          <option value="open-in-progress">Open (in-progress)</option>
          <option value="snoozed">Snoozed</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* 4. All Priorities */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
        </select>

        {/* 5. All Sentiments */}
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">😊 Positive</option>
          <option value="neutral">😐 Neutral</option>
          <option value="negative">😟 Negative</option>
          <option value="angry">😡 Angry</option>
        </select>

        {/* 6. All Time */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="block w-full rounded-lg border-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white border-gray-300"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        </div>

        {/* Search Bar - Only shows when search icon is clicked */}
        {searchOpen && (
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticket #, name, email, description... or enter ticket numbers: 112, 119, 122"
                className="w-full pl-10 pr-10 py-2 rounded-lg border-2 border-indigo-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        )}

        {/* Action Bar - Merge/Reassign buttons and selection info */}
        {(selectedTickets.length > 0) && (() => {
          // Check if all selected tickets have the same customer email
          const selectedTicketData = selectedTickets.map(id => tickets.find((t: any) => t.ticket_id === id)).filter(Boolean)
          const uniqueEmails = new Set(selectedTicketData.map((t: any) => t?.customer_email))
          const canMerge = selectedTickets.length >= 2 && uniqueEmails.size === 1
          
          return (
          <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-indigo-700 mr-2">
              {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} selected
            </span>
            
            {/* Merge Button - shows when 2+ tickets selected with SAME email */}
            {selectedTickets.length >= 2 && (
              <button
                onClick={() => canMerge ? setShowMergeConfirm(true) : alert('Can only merge tickets from the same customer email address')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg ${
                  canMerge 
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }`}
                title={canMerge ? 'Merge selected tickets' : 'Can only merge tickets from the same customer email'}
              >
                <GitMerge className="w-4 h-4" />
                <span>Merge</span>
                {!canMerge && <span className="text-xs">(different emails)</span>}
              </button>
            )}

            {/* Reassign Button - shows when 1+ tickets selected */}
            <button
              onClick={() => setShowReassignModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Reassign</span>
            </button>

            {/* Delete Button - Admin only */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedTickets([])}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg border border-gray-300"
            >
              Clear
            </button>
          </div>
          )
        })()}
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-4">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="w-full divide-y divide-gray-300" style={{tableLayout: 'fixed'}}>
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 w-14 text-center">
                  <input
                    type="checkbox"
                    checked={selectedTickets.length > 0 && selectedTickets.length === tickets.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTickets(tickets.map((t: any) => t.ticket_id))
                      } else {
                        setSelectedTickets([])
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </th>
                <th scope="col" className="py-3.5 pl-2 pr-2 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('ticket_number')} style={{width: '9%', minWidth: '90px'}}>
                  <div className="flex items-center gap-1">
                    Ticket #
                    {sortColumn === 'ticket_number' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')} style={{width: '10%'}}>
                  <div className="flex items-center gap-1">
                    Created
                    {sortColumn === 'created_at' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customer_name')} style={{width: '14%'}}>
                  <div className="flex items-center gap-1">
                    Customer
                    {sortColumn === 'customer_name' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('subject')} style={{width: '22%'}}>
                  <div className="flex items-center gap-1">
                    Subject
                    {sortColumn === 'subject' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('priority')} style={{width: '8%'}}>
                  <div className="flex items-center gap-1">
                    Priority
                    {sortColumn === 'priority' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')} style={{width: '9%'}}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortColumn === 'status' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('assigned_to')} style={{width: '10%'}}>
                  <div className="flex items-center gap-1">
                    Assignment
                    {sortColumn === 'assigned_to' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-3.5 pr-2 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('sentiment')} style={{width: '10%'}}>
                  <div className="flex items-center gap-1">
                    Sentiment
                    {sortColumn === 'sentiment' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-gray-500">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket: any) => {
                    // Build URL with filter context
                    // Chat tickets go to chat ticket detail, email tickets go to ticket detail
                    let ticketUrl: string;
                    if (ticket.channel === 'chat') {
                      // Chat tickets go to dedicated chat ticket detail page
                      ticketUrl = `/chat-ticket/${ticket.ticket_id}`;
                    } else {
                      const params = new URLSearchParams()
                      if (vipFilter) {
                        params.set('filter', 'vip')
                      } else if (assignmentFilter !== 'all' && assignmentFilter !== 'vip') {
                        params.set('from', assignmentFilter)
                      }
                      ticketUrl = params.toString() 
                        ? `/tickets/${ticket.ticket_id}?${params.toString()}`
                        : `/tickets/${ticket.ticket_id}`;
                    }
                    
                    const rowBgClass = ticket.has_escalation === 1 
                      ? 'bg-orange-50' 
                      : ticket.status === 'snoozed' 
                        ? 'bg-purple-100' 
                        : ticket.merged_from
                          ? 'bg-cyan-50'
                          : ''
                    
                    const isSelected = selectedTickets.includes(ticket.ticket_id)
                    const selectionIndex = selectedTickets.indexOf(ticket.ticket_id)
                    
                    return (
                    <tr key={ticket.ticket_id} className={`${rowBgClass} ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="py-3 w-14 text-center relative">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTickets([...selectedTickets, ticket.ticket_id])
                            } else {
                              setSelectedTickets(selectedTickets.filter(id => id !== ticket.ticket_id))
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        {isSelected && selectionIndex === 0 && (
                          <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600" title="Primary ticket (will be kept)">①</span>
                        )}
                      </td>
                      <td className="py-3 pl-2 pr-2 text-sm font-medium">
                        <Link 
                          to={ticketUrl}
                          className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1.5"
                        >
                          <PlatformIcon platform={ticket.channel || 'email'} className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">{formatTicketNumber(ticket.ticket_number)}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-500">
                        <div className="text-xs truncate">{new Date(ticket.created_at).toLocaleString()}</div>
                        <div className="text-xs text-gray-400 truncate">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</div>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-500">
                        <Link 
                          to={`/tickets?customer=${encodeURIComponent(ticket.customer_email)}`}
                          className="block hover:bg-gray-50 -m-1 p-1 rounded transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-900 hover:text-indigo-600 font-medium text-xs truncate">{ticket.customer_name}</span>
                              {ticket.vip === 1 && (
                                <span className="text-yellow-500 text-xs flex-shrink-0" title="VIP Customer">⭐</span>
                              )}
                            </div>
                            <div className="text-gray-500 hover:text-indigo-500 text-xs truncate">{ticket.customer_email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-500">
                        <div className="truncate text-xs">{ticket.subject || ticket.description || 'No subject'}</div>
                      </td>
                      <td className="px-2 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityColors[ticket.priority as keyof typeof priorityColors] || priorityColors.normal}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm">
                        <div className="relative inline-block">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColors[ticket.status as keyof typeof statusColors] || statusColors.open}`}>
                            {ticket.status}
                          </span>
                          {ticket.is_escalated_to_me === 1 && (
                            <span className="absolute -top-1 -right-1 text-xs leading-none" title="Escalated - You've been asked for help">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-500">
                        {ticket.assigned_to ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 truncate">
                            {staffNames[ticket.assigned_to] || ticket.assigned_staff_name || ticket.assigned_to}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-300">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 pr-2 text-sm">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sentimentColors[ticket.sentiment as keyof typeof sentimentColors] || sentimentColors.neutral}`}>
                          {sentimentIcons[ticket.sentiment as keyof typeof sentimentIcons] || '😐'} {ticket.sentiment || 'neutral'}
                        </span>
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
          </table>
        </div>
      </div>

      {/* Merge Confirmation Modal */}
      {showMergeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-full">
                <GitMerge className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Merge Tickets</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              You are about to merge <span className="font-semibold">{selectedTickets.length} tickets</span> into one.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Tickets to merge:</p>
              <ul className="space-y-1">
                {selectedTickets.map((ticketId, index) => {
                  const ticket = tickets.find((t: any) => t.ticket_id === ticketId)
                  return (
                    <li key={ticketId} className="flex items-center gap-2 text-sm">
                      {index === 0 ? (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">PRIMARY</span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">merge</span>
                      )}
                      <span className="font-medium">{ticket?.ticket_number}</span>
                      <span className="text-gray-500 truncate">- {ticket?.subject}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>What will happen:</strong>
                <br />• All messages will be merged into the PRIMARY ticket in chronological order
                <br />• Secondary tickets will be closed with a note
                <br />• This action cannot be undone
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMergeConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isMerging}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsMerging(true)
                  try {
                    const [primaryId, ...secondaryIds] = selectedTickets
                    await ticketsApi.merge(primaryId, secondaryIds)
                    setShowMergeConfirm(false)
                    setSelectedTickets([])
                    // Refresh the ticket list
                    window.location.reload()
                  } catch (error: any) {
                    console.error('Failed to merge tickets:', error)
                    alert(`Failed to merge tickets: ${error.response?.data?.error || error.message || 'Unknown error'}`)
                  } finally {
                    setIsMerging(false)
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                disabled={isMerging}
              >
                {isMerging ? 'Merging...' : 'Merge Tickets'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal - uses the same ReassignModal component */}
      <ReassignModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onReassign={async (staffId, _staffName, reason) => {
          try {
            await ticketsApi.bulkAssign(selectedTickets, staffId)
            // TODO: Save reason to ticket notes if provided
            if (reason) {
              console.log('Bulk reassignment reason:', reason)
            }
            setShowReassignModal(false)
            setSelectedTickets([])
            // Refresh the ticket list
            window.location.reload()
          } catch (error: any) {
            console.error('Failed to reassign tickets:', error)
            alert(`Failed to reassign tickets: ${error.response?.data?.error || error.message || 'Unknown error'}`)
          }
        }}
        bulkMode={true}
        selectedTickets={selectedTickets.map(ticketId => {
          const ticket = tickets.find((t: any) => t.ticket_id === ticketId)
          return {
            ticket_id: ticketId,
            ticket_number: ticket?.ticket_number || '',
            subject: ticket?.subject || ''
          }
        })}
      />

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Tickets</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-semibold">{selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}</span>?
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">Tickets to delete:</p>
              <ul className="space-y-1">
                {selectedTickets.map((ticketId) => {
                  const ticket = tickets.find((t: any) => t.ticket_id === ticketId)
                  return (
                    <li key={ticketId} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-red-600">{ticket?.ticket_number}</span>
                      <span className="text-gray-500 truncate">- {ticket?.subject}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-800">
                <strong>⚠️ Warning:</strong> This action cannot be undone. All selected tickets and their messages will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true)
                  try {
                    // Delete each ticket
                    for (const ticketId of selectedTickets) {
                      await ticketsApi.delete(ticketId)
                    }
                    setShowBulkDeleteConfirm(false)
                    setSelectedTickets([])
                    // Refresh the ticket list
                    window.location.reload()
                  } catch (error: any) {
                    console.error('Failed to delete tickets:', error)
                    alert(`Failed to delete tickets: ${error.response?.data?.error || error.message || 'Unknown error'}`)
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedTickets.length} Ticket${selectedTickets.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
