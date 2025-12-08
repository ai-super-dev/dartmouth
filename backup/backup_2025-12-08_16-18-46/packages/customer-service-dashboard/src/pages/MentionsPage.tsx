import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mentionsApi, groupChatApi, staffApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { AtSign, MessageSquare, Hash, Calendar, Filter, ExternalLink, Shield, ChevronLeft, ChevronRight, Search, X, Mail, Phone, MessageCircle, Paperclip } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Mention {
  id: string;
  message_id: string;
  mentioned_staff_id: string;
  mentioning_staff_id: string;
  mention_type: string;
  context_type: string;
  context_id: string;
  is_read: number;
  is_archived: number;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  ticket_id: string | null;
  ticket_number: string | null;
  customer_name: string | null;
  mentioning_first_name: string;
  mentioning_last_name: string;
  mentioning_email: string;
  channel_name: string | null;
  message_content: string | null;
  ticket_channel: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
}

export default function MentionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null);
  const [showFilters, setShowFilters] = useState(false); // Collapsed by default

  // Multi-select state for Shift+Click
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Filter state
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [viewMode, setViewMode] = useState<'my-mentions' | 'all-mentions' | 'by-staff' | 'by-ticket'>(
    'my-mentions' // Always default to "My Mentions" for everyone
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [ticketNumberFilter, setTicketNumberFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<string>('active'); // 'active' or 'archived'
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch all staff for filter
  const { data: staffData } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const response = await staffApi.list();
      return response.data;
    },
  });

  // Include McCarthy AI in the staff list
  const allStaff = React.useMemo(() => {
    const staff = staffData?.staff || [];
    return [
      ...staff,
      { id: 'ai-agent-001', firstName: 'McCarthy', lastName: 'AI', email: 'mccarthy@dartmouth.ai' }
    ];
  }, [staffData]);

  // Fetch mentions
  const { data: mentionsData, isLoading } = useQuery({
    queryKey: ['mentions', viewMode, selectedStaffId, ticketNumberFilter, channelFilter, timeFilter, statusFilter, archiveFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      
      // View mode logic
      if (viewMode === 'my-mentions') {
        // Default - shows mentions for current user (handled by backend)
      } else if (viewMode === 'all-mentions' && isAdmin) {
        params.view_all = true; // Admin can see all mentions
      } else if (viewMode === 'by-staff' && selectedStaffId) {
        params.mentioned_staff_id = selectedStaffId;
      } else if (viewMode === 'by-ticket' && ticketNumberFilter) {
        params.ticket_number = ticketNumberFilter;
      }
      
      if (channelFilter) params.channel_id = channelFilter;
      if (timeFilter && timeFilter !== 'all') params.time_filter = timeFilter;
      if (statusFilter === 'unread') params.is_read = false;
      if (statusFilter === 'read') params.is_read = true;
      if (archiveFilter === 'archived') params.is_archived = true;
      if (archiveFilter === 'active') params.is_archived = false;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;

      const response = await mentionsApi.getMentions(params);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds (increased to prevent overwriting optimistic updates)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const mentions: Mention[] = mentionsData?.mentions || [];

  // Client-side search filter
  const filteredMentions = React.useMemo(() => {
    if (!searchQuery.trim()) return mentions;

    const query = searchQuery.toLowerCase().trim();
    
    return mentions.filter(mention => {
      // Extract just the number from search query (e.g., "1234" from "@1234" or "ticket 1234")
      const searchNumber = query.match(/\d+/)?.[0];
      
      // If searching by number, check message content for ticket references
      if (searchNumber && mention.message_content) {
        const messageContent = mention.message_content.toLowerCase();
        // Check for @1234, #1234, ticket 1234, TKT-1234, etc.
        const ticketPatterns = [
          `@${searchNumber}`,
          `#${searchNumber}`,
          `ticket ${searchNumber}`,
          `tkt-${searchNumber}`,
          `tkt-000${searchNumber}`,
        ];
        
        if (ticketPatterns.some(pattern => messageContent.includes(pattern))) {
          return true;
        }
        
        // Also check if message contains the number anywhere
        if (messageContent.includes(searchNumber)) {
          return true;
        }
      }
      
      // Search in ticket_number field
      if (searchNumber && mention.ticket_number) {
        const ticketNum = mention.ticket_number.match(/\d+/)?.[0];
        if (ticketNum === searchNumber) return true;
      }

      // Search in staff name
      const staffName = `${mention.mentioning_first_name} ${mention.mentioning_last_name}`.toLowerCase();
      if (staffName.includes(query)) return true;

      // Search in message content (full text search)
      if (mention.message_content?.toLowerCase().includes(query)) return true;

      // Search in channel name
      if (mention.channel_name?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [mentions, searchQuery]);

  // Auto-select first mention on load
  React.useEffect(() => {
    if (filteredMentions.length > 0 && !selectedMention) {
      setSelectedMention(filteredMentions[0]);
      // DO NOT auto-mark as read - user must click the button
    }
  }, [filteredMentions]);

  // Sync the list view when selectedMention changes (from button clicks)
  // This ensures the left column updates when Mark as Read/Unread is clicked
  React.useEffect(() => {
    if (selectedMention) {
      const updatedMention = filteredMentions.find(m => m.id === selectedMention.id);
      // Only update if the mention still exists in the filtered list
      // This keeps the left column in sync with the right column
      if (updatedMention) {
        // The list will re-render automatically when filteredMentions changes
      }
    }
  }, [selectedMention]);

  // Navigation functions
  const navigateToPrevious = () => {
    if (!selectedMention || filteredMentions.length === 0) return;
    const currentIndex = filteredMentions.findIndex(m => m.id === selectedMention.id);
    if (currentIndex > 0) {
      const prevMention = filteredMentions[currentIndex - 1];
      setSelectedMention(prevMention);
      // DO NOT auto-mark as read - user must click the button
    }
  };

  const navigateToNext = () => {
    if (!selectedMention || filteredMentions.length === 0) return;
    const currentIndex = filteredMentions.findIndex(m => m.id === selectedMention.id);
    if (currentIndex < filteredMentions.length - 1) {
      const nextMention = filteredMentions[currentIndex + 1];
      setSelectedMention(nextMention);
      // DO NOT auto-mark as read - user must click the button
    }
  };

  const currentMentionIndex = selectedMention 
    ? filteredMentions.findIndex(m => m.id === selectedMention.id) 
    : -1;

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['mentions-unread-count'],
    queryFn: async () => {
      const response = await mentionsApi.getUnreadCount();
      return response.data;
    },
    refetchInterval: 5000,
  });

  const unreadCount = unreadData?.count || 0;

  // Fetch channels for filter
  const { data: channelsData } = useQuery({
    queryKey: ['group-chat-channels'],
    queryFn: async () => {
      const response = await groupChatApi.listChannels();
      return response.data;
    },
  });

  const channels = channelsData?.channels || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (mentionId: string) => {
      console.log('[Mentions] Marking as read:', mentionId);
      const response = await mentionsApi.markAsRead(mentionId);
      console.log('[Mentions] Mark as read response:', response);
      return response;
    },
    onMutate: async (mentionId) => {
      console.log('[Mentions] onMutate - marking as read:', mentionId);
      
      // Build the correct queryKey with all filter parameters
      const currentQueryKey = ['mentions', viewMode, selectedStaffId, ticketNumberFilter, channelFilter, timeFilter, statusFilter, archiveFilter, dateFrom, dateTo];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: currentQueryKey });
      
      // Snapshot previous value
      const previousMentions = queryClient.getQueryData(currentQueryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData(currentQueryKey, (old: any) => {
        if (!old?.mentions) return old;
        return {
          ...old,
          mentions: old.mentions.map((m: Mention) =>
            m.id === mentionId ? { ...m, is_read: 1, read_at: new Date().toISOString() } : m
          ),
        };
      });
      
      // Update selected mention immediately
      if (selectedMention && selectedMention.id === mentionId) {
        setSelectedMention({
          ...selectedMention,
          is_read: 1,
          read_at: new Date().toISOString(),
        });
      }
      
      return { previousMentions, currentQueryKey };
    },
    onError: (err: any, _mentionId, context: any) => {
      console.error('[Mentions] Error marking as read:', err);
      // Rollback on error
      queryClient.setQueryData(context.currentQueryKey, context.previousMentions);
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: context.currentQueryKey });
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
    onSuccess: () => {
      console.log('[Mentions] Successfully marked as read');
      // Only invalidate unread count, not the full mentions list
      // This prevents the optimistic update from being overwritten
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
  });

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: async (mentionId: string) => {
      console.log('[Mentions] Marking as unread:', mentionId);
      const response = await mentionsApi.markAsUnread(mentionId);
      console.log('[Mentions] Mark as unread response:', response);
      return response;
    },
    onMutate: async (mentionId) => {
      // Build the correct queryKey with all filter parameters
      const currentQueryKey = ['mentions', viewMode, selectedStaffId, ticketNumberFilter, channelFilter, timeFilter, statusFilter, archiveFilter, dateFrom, dateTo];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: currentQueryKey });
      
      // Snapshot previous value
      const previousMentions = queryClient.getQueryData(currentQueryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData(currentQueryKey, (old: any) => {
        if (!old?.mentions) return old;
        return {
          ...old,
          mentions: old.mentions.map((m: Mention) =>
            m.id === mentionId ? { ...m, is_read: 0, read_at: null } : m
          ),
        };
      });
      
      // Update selected mention immediately
      if (selectedMention && selectedMention.id === mentionId) {
        setSelectedMention({
          ...selectedMention,
          is_read: 0,
          read_at: null,
        });
      }
      
      return { previousMentions, currentQueryKey };
    },
    onError: (_err, _mentionId, context: any) => {
      // Rollback on error
      queryClient.setQueryData(context.currentQueryKey, context.previousMentions);
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: context.currentQueryKey });
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
    onSuccess: () => {
      // Only invalidate unread count, not the full mentions list
      // This prevents the optimistic update from being overwritten
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
  });

  // Batch update mutation for multi-select
  const batchUpdateMutation = useMutation({
    mutationFn: async (data: { mentionIds: string[]; isRead: boolean }) => {
      // Call API for each mention (could be optimized with a batch endpoint)
      const promises = data.mentionIds.map(id => 
        data.isRead 
          ? mentionsApi.markAsRead(id)
          : mentionsApi.markAsUnread(id)
      );
      return Promise.all(promises);
    },
    onMutate: async (data) => {
      const currentQueryKey = ['mentions', viewMode, selectedStaffId, ticketNumberFilter, channelFilter, timeFilter, statusFilter, archiveFilter, dateFrom, dateTo];
      await queryClient.cancelQueries({ queryKey: currentQueryKey });
      const previousMentions = queryClient.getQueryData(currentQueryKey);
      
      queryClient.setQueryData(currentQueryKey, (old: any) => {
        if (!old?.mentions) return old;
        return {
          ...old,
          mentions: old.mentions.map((m: Mention) =>
            data.mentionIds.includes(m.id) 
              ? { ...m, is_read: data.isRead ? 1 : 0, read_at: data.isRead ? new Date().toISOString() : null } 
              : m
          ),
        };
      });
      
      return { previousMentions, currentQueryKey };
    },
    onError: (_err, _data, context: any) => {
      queryClient.setQueryData(context.currentQueryKey, context.previousMentions);
      queryClient.invalidateQueries({ queryKey: context.currentQueryKey });
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
    onSuccess: () => {
      setSelectedMentionIds([]); // Clear selection after batch update
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count'] });
    },
  });

  // Archive Read mentions mutation
  const archiveReadMentionsMutation = useMutation({
    mutationFn: async () => {
      // Archive all Read mentions (not archived yet)
      const readMentions = mentions.filter(m => m.is_read === 1 && m.is_archived === 0);
      const promises = readMentions.map(m => mentionsApi.archiveMention(m.id));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] });
    },
  });

  const handleMentionClick = (mention: Mention, event?: React.MouseEvent) => {
    console.log('[MentionsPage] Clicking mention:', mention.id);
    
    // Handle Shift+Click for multi-select
    if (event?.shiftKey && lastClickedIndex !== null) {
      const currentIndex = filteredMentions.findIndex(m => m.id === mention.id);
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      const rangeIds = filteredMentions.slice(start, end + 1).map(m => m.id);
      setSelectedMentionIds(rangeIds);
    } else if (event?.ctrlKey || event?.metaKey) {
      // Ctrl/Cmd+Click to toggle individual selection
      setSelectedMentionIds(prev => 
        prev.includes(mention.id) 
          ? prev.filter(id => id !== mention.id)
          : [...prev, mention.id]
      );
      setLastClickedIndex(filteredMentions.findIndex(m => m.id === mention.id));
    } else {
      // Normal click - clear selection and select this mention
      setSelectedMentionIds([]);
      setLastClickedIndex(filteredMentions.findIndex(m => m.id === mention.id));
      setSelectedMention(mention);
    }
    // DO NOT auto-mark as read - user must click the "Mark as Read" button
  };

  const handleGoToContext = () => {
    if (!selectedMention) return;

    if (selectedMention.context_type === 'group_chat') {
      // Navigate to group chat with channel and message ID to highlight
      navigate(`/group-chat?channel=${selectedMention.context_id}&message=${selectedMention.message_id}`);
    } else if (selectedMention.ticket_id) {
      navigate(`/tickets/${selectedMention.ticket_id}`);
    }
  };

  // Format ticket number to @173 format (mention style)
  const formatTicketNumber = (ticketNumber: string | null): string => {
    if (!ticketNumber) return '';
    const match = ticketNumber.match(/\d+/);
    if (!match) return ticketNumber;
    const num = parseInt(match[0], 10); // This removes leading zeros
    return `@${num}`;
  };

  // Get icon for ticket based on channel/platform
  const getTicketIcon = (channel: string | null, size: string = "w-3 h-3") => {
    switch (channel) {
      case 'email':
        return <Mail className={size} />;
      case 'phone':
      case 'callback':
        // RED for callback requests
        return <Phone className={`${size} text-red-600`} />;
      case 'chat':
        return <MessageSquare className={size} />;
      case 'whatsapp':
      case 'facebook':
      case 'instagram':
        return <MessageCircle className={size} />;
      default:
        return <MessageSquare className={size} />;
    }
  };

  // Parse and linkify ticket numbers in message content
  const linkifyTickets = (text: string) => {
    if (!text) return null;

    // Regex to match: @261, TKT-261, ticket 261, #261
    const ticketRegex = /(@(\d+)|TKT-(\d+)|ticket\s+(\d+)|#(\d+))/gi;
    
    const parts: Array<{ text: string; isTicket: boolean; ticketNumber?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = ticketRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isTicket: false });
      }

      // Extract ticket number from whichever group matched
      const ticketNumber = match[2] || match[3] || match[4] || match[5];
      
      // Keep the original format for display, use number for search
      parts.push({ 
        text: match[0], 
        isTicket: true, 
        ticketNumber: ticketNumber // Just the number, will search by it
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isTicket: false });
    }

    // If no tickets found, return plain text
    if (parts.length === 0) {
      return <span>{text}</span>;
    }

    // Render with clickable links
    return (
      <span>
        {parts.map((part, index) => 
          part.isTicket ? (
            <a
              key={index}
              href={`/tickets?search=TKT-${part.ticketNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
            >
              {part.text}
            </a>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Pane - Mentions List */}
      <div className="w-96 bg-white flex flex-col h-full border-r border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AtSign className="w-6 h-6" />
              Mentions
              {viewMode === 'all-mentions' && isAdmin && (
                <span title="Admin View">
                  <Shield className="w-5 h-5 text-blue-600" />
                </span>
              )}
            </h1>
            {unreadCount > 0 && viewMode === 'my-mentions' && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-500">
            {viewMode === 'my-mentions' && 'Messages where you were mentioned'}
            {viewMode === 'all-mentions' && isAdmin && 'All mentions (Admin view)'}
            {viewMode === 'by-staff' && selectedStaffId && `Mentions for ${allStaff.find((s: any) => s.id === selectedStaffId)?.firstName || 'staff member'}`}
            {viewMode === 'by-staff' && !selectedStaffId && 'Select a staff member to view their mentions'}
            {viewMode === 'by-ticket' && ticketNumberFilter && `Mentions in ${ticketNumberFilter}`}
            {viewMode === 'by-ticket' && !ticketNumberFilter && 'Enter a ticket number to view mentions'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? `${filteredMentions.length} of ${mentions.length}` : `${mentions.length}`} mention{mentions.length !== 1 ? 's' : ''} {searchQuery ? 'matching' : 'found'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket (@261), staff name, or message..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters and Quick Pills */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Filters {showFilters ? '▼' : '▶'}
            </button>
            
            {/* Quick Filter Pills - Right Side */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (selectedMentionIds.length > 0) {
                    batchUpdateMutation.mutate({ mentionIds: selectedMentionIds, isRead: false });
                  } else {
                    setStatusFilter('unread');
                  }
                }}
                className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={selectedMentionIds.length > 0 ? `Mark ${selectedMentionIds.length} as unread` : 'Show unread only'}
              >
                Unread ({mentions.filter(m => m.is_read === 0 && m.is_archived === 0).length})
              </button>
              <button
                onClick={() => {
                  if (selectedMentionIds.length > 0) {
                    batchUpdateMutation.mutate({ mentionIds: selectedMentionIds, isRead: true });
                  } else {
                    setStatusFilter('read');
                  }
                }}
                className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === 'read'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={selectedMentionIds.length > 0 ? `Mark ${selectedMentionIds.length} as read` : 'Show read only'}
              >
                Read ({mentions.filter(m => m.is_read === 1 && m.is_archived === 0).length})
              </button>
              <button
                onClick={() => {
                  if (archiveFilter === 'archived') {
                    setArchiveFilter('active');
                  } else {
                    archiveReadMentionsMutation.mutate();
                  }
                }}
                disabled={archiveReadMentionsMutation.isPending}
                className="px-2 py-0.5 text-xs font-medium rounded-full transition-colors bg-pink-100 text-pink-700 hover:bg-pink-200 disabled:opacity-50"
                title="Archive all Read mentions"
              >
                Archive
              </button>
            </div>
          </div>
          
          {/* Keyboard Shortcuts Info */}
          {selectedMentionIds.length > 0 ? (
            <p className="text-xs text-gray-500 mt-1">
              💡 {selectedMentionIds.length} selected • Click pill to toggle read/unread
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              ⌨️ Shift+Click: Select range • Ctrl/Cmd+Click: Toggle selection
            </p>
          )}

          {/* Active Filters Summary (when collapsed) */}
          {!showFilters && (
            <div className="flex flex-wrap gap-1 mt-2">
              {/* View Mode */}
              {viewMode !== (isAdmin ? 'all-mentions' : 'my-mentions') && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {viewMode === 'my-mentions' && 'My Mentions'}
                  {viewMode === 'all-mentions' && 'All Mentions'}
                  {viewMode === 'by-staff' && selectedStaffId && `Staff: ${allStaff.find((s: any) => s.id === selectedStaffId)?.firstName}`}
                  {viewMode === 'by-ticket' && ticketNumberFilter && `Ticket: ${ticketNumberFilter}`}
                </span>
              )}
              
              {/* Channel Filter */}
              {channelFilter && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  #{channels.find((c: any) => c.id === channelFilter)?.name || 'Channel'}
                </span>
              )}
              
              {/* Status Filter */}
              {statusFilter !== 'all' && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  statusFilter === 'unread' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {statusFilter === 'unread' ? 'Unread' : 'Read'}
                </span>
              )}
              
              {/* Time Filter */}
              {timeFilter && timeFilter !== '' && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                  {timeFilter === 'hour' && 'Last hour'}
                  {timeFilter === '12hours' && 'Last 12h'}
                  {timeFilter === '24hours' && 'Last 24h'}
                  {timeFilter === 'custom' && 'Custom dates'}
                </span>
              )}
              
              {/* Show "No filters" if nothing is set */}
              {!channelFilter && statusFilter === 'all' && !timeFilter && viewMode === (isAdmin ? 'all-mentions' : 'my-mentions') && (
                <span className="text-xs text-gray-500 italic">No filters applied</span>
              )}
            </div>
          )}

          {showFilters && (
            <div className="space-y-3">
              {/* View Mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">View</label>
                <select
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value as any);
                    setSelectedStaffId('');
                    setTicketNumberFilter('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="my-mentions">My Mentions</option>
                  {isAdmin && <option value="all-mentions">All Mentions (Admin)</option>}
                  <option value="by-staff">By Staff Member</option>
                  <option value="by-ticket">By Ticket Number</option>
                </select>
              </div>

              {/* Staff Member Filter (shown when "By Staff Member" is selected) */}
              {viewMode === 'by-staff' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Staff Member</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select staff member...</option>
                    {allStaff.map((staff: any) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ticket Number Filter (shown when "By Ticket" is selected) */}
              {viewMode === 'by-ticket' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ticket Number</label>
                  <input
                    type="text"
                    value={ticketNumberFilter}
                    onChange={(e) => setTicketNumberFilter(e.target.value)}
                    placeholder="e.g., TKT-000261"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Channel Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Channel</label>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All channels</option>
                  {channels.map((channel: any) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread only</option>
                  <option value="read">Read only</option>
                </select>
              </div>

              {/* Archive Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Archive</label>
                <select
                  value={archiveFilter}
                  onChange={(e) => setArchiveFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active mentions</option>
                  <option value="archived">All Archived</option>
                </select>
              </div>

              {/* Time Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Time Range</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All time</option>
                  <option value="hour">Last hour</option>
                  <option value="12hours">Last 12 hours</option>
                  <option value="24hours">Last 24 hours</option>
                  <option value="custom">Custom date range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {timeFilter === 'custom' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  setViewMode(isAdmin ? 'all-mentions' : 'my-mentions');
                  setSelectedStaffId('');
                  setTicketNumberFilter('');
                  setChannelFilter('');
                  setTimeFilter('');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Mentions List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading mentions...</div>
            </div>
          ) : filteredMentions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <AtSign className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No mentions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                When someone mentions you with @yourname, it will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMentions.map((mention) => {
                const isSelected = selectedMention?.id === mention.id;
                const isMultiSelected = selectedMentionIds.includes(mention.id);
                const isUnread = mention.is_read === 0;
                
                // Background: lighter for non-selected, slightly darker for selected
                let bgClass = '';
                let borderClass = '';
                
                if (isMultiSelected) {
                  // Multi-selected items: purple/indigo highlight
                  bgClass = 'bg-indigo-100';
                  borderClass = 'border-indigo-500';
                } else if (isSelected) {
                  // Selected items: show colored border and distinct background
                  bgClass = isUnread ? 'bg-blue-100' : 'bg-gray-100';
                  borderClass = isUnread ? 'border-blue-500' : 'border-gray-500';
                  console.log('[MentionsPage] Selected mention:', mention.id, 'border:', borderClass);
                } else {
                  // Non-selected items: subtle background, NO border
                  bgClass = isUnread ? 'bg-blue-50' : 'bg-white';
                  borderClass = 'border-transparent';
                }
                
                return (
                <button
                  key={mention.id}
                  onClick={(e) => handleMentionClick(mention, e)}
                  style={{
                    borderLeft: isMultiSelected 
                      ? '6px solid #6366f1' 
                      : isSelected 
                        ? (isUnread ? '6px solid #3b82f6' : '6px solid #6b7280') 
                        : '6px solid transparent'
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${bgClass} relative`}
                >
                  {/* Multi-select checkbox indicator */}
                  {isMultiSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {/* Pills row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Channel/Ticket pill */}
                      {mention.context_type === 'group_chat' ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          <Hash className="w-3 h-3" />
                          {mention.channel_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                          {getTicketIcon(mention.ticket_channel)}
                          {formatTicketNumber(mention.ticket_number)}
                        </span>
                      )}
                      
                      {/* Mentioned by pill */}
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-full">
                        <AtSign className="w-3 h-3" />
                        Mention by {mention.mentioning_first_name}
                      </span>
                      
                      {/* Date/Time */}
                      <span className="text-xs text-gray-600">
                        {new Date(mention.created_at).toLocaleString()}
                      </span>
                      
                      {/* Read/Unread pill */}
                      {mention.is_read === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Unread
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          ✓ Read
                        </span>
                      )}
                    </div>

                    {/* Message Preview */}
                    {mention.message_content && (
                      <div className={`text-sm line-clamp-2 ${mention.is_read === 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {linkifyTickets(mention.message_content)}
                      </div>
                    )}
                    
                    {/* Attachment Indicator - Clickable to navigate to message */}
                    {mention.attachment_url && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent selecting the mention
                          if (mention.context_type === 'group_chat') {
                            navigate(`/group-chat?channel=${mention.context_id}&message=${mention.message_id}`);
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span className="hover:underline">{mention.attachment_name || 'Attachment'}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Mention Details */}
      <div className="flex-1 bg-white flex flex-col h-full">
        {selectedMention ? (
          <>
            {/* Header - Pills and Buttons */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="space-y-3">
                {/* Top row - Context pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Channel/Ticket pill */}
                  {selectedMention.context_type === 'group_chat' ? (
                    <span className="inline-flex items-center gap-0.5 px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      <Hash className="w-3.5 h-3.5" />
                      {selectedMention.channel_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full">
                      {getTicketIcon(selectedMention.ticket_channel, "w-3.5 h-3.5")}
                      {formatTicketNumber(selectedMention.ticket_number)}
                    </span>
                  )}
                  
                  {/* Mentioned by pill */}
                  <span className="inline-flex items-center gap-0.5 px-3 py-1 text-sm font-medium bg-orange-50 text-orange-600 rounded-full">
                    <AtSign className="w-3.5 h-3.5" />
                    Mention by {selectedMention.mentioning_first_name}
                  </span>
                  
                  {/* Date/Time pill */}
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedMention.created_at).toLocaleString()}
                  </span>
                  
                  {/* Read/Unread pill */}
                  {selectedMention.is_read === 0 ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700 rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Unread
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full">
                      ✓ Read
                    </span>
                  )}
                </div>
                
                {/* Bottom row - Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Navigation Arrows */}
                  <button
                    onClick={navigateToPrevious}
                    disabled={currentMentionIndex === 0}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous mention"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={navigateToNext}
                    disabled={currentMentionIndex === filteredMentions.length - 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next mention"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  {/* Mark as Read/Unread button */}
                  {selectedMention.is_read === 1 ? (
                    <button
                      onClick={() => markAsUnreadMutation.mutate(selectedMention.id)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
                    >
                      Mark as Unread
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsReadMutation.mutate(selectedMention.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-300"
                    >
                      Mark as Read
                    </button>
                  )}
                  
                  {/* Go to Chat button */}
                  <button
                    onClick={handleGoToContext}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Go to Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Content - Message */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Message</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-900 whitespace-pre-wrap text-base leading-relaxed">
                    {selectedMention.message_content 
                      ? linkifyTickets(selectedMention.message_content)
                      : 'No message content available'}
                  </div>
                  
                  {/* Attachment - Clickable to navigate to message */}
                  {selectedMention.attachment_url && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          if (selectedMention.context_type === 'group_chat') {
                            navigate(`/group-chat?channel=${selectedMention.context_id}&message=${selectedMention.message_id}`);
                          }
                        }}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span>{selectedMention.attachment_name || 'Attachment'}</span>
                        {selectedMention.attachment_size && (
                          <span className="text-xs text-gray-500">
                            ({(selectedMention.attachment_size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </button>
                      <p className="text-xs text-gray-400 mt-1 ml-6">
                        Click to view in Group Chat
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AtSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Select a mention to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
