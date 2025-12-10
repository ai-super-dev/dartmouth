import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { groupChatApi, staffApi, memosApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Hash, Plus, Send, Paperclip, Users, X, Image as ImageIcon, File, Pencil, Trash2, Smile, Download, ArrowDown, StickyNote, Loader2 } from 'lucide-react';
import { parseTagsFromStorage, TAG_HELP_TEXT } from '../utils/tagParser';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  edited_at: string | null;
  edited_by: string | null;
  reactions: string | null;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string | null;
}

interface Member {
  id: string;
  staff_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  availability_status: string;
  avatar_url: string | null;
}

// Helper function to check if message can be edited/deleted (within 10 minutes)
export default function GroupChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteAttachment, setDeleteAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState<string | null>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessageId, setShareMessageId] = useState<string | null>(null);
  const [shareComment, setShareComment] = useState('');
  const [shareToChannelId, setShareToChannelId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ['group-chat-channels'],
    queryFn: async () => {
      const response = await groupChatApi.listChannels();
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const channels: Channel[] = channelsData?.channels || [];

  // Fetch global time limit
  const { data: timeLimitData } = useQuery({
    queryKey: ['group-chat-time-limit'],
    queryFn: async () => {
      const response = await groupChatApi.getTimeLimit();
      return response.data;
    },
  });

  const globalTimeLimit = timeLimitData?.timeLimit ?? 10; // Default to 10 minutes

  // Helper function to check if a message can be edited/deleted
  const canEditOrDelete = (message: Message): boolean => {
    if (user?.role === 'admin') return true; // Admins can always edit/delete
    
    // If time limit is 0, always allow
    if (globalTimeLimit === 0) return true;
    
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const timeLimitMs = globalTimeLimit * 60 * 1000;
    return message.sender_id === user?.id && (now - messageTime) <= timeLimitMs;
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Function to scroll to and highlight a specific message
  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 5000);
  };

  // Set first channel as active if none selected
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Handle URL parameters for channel and message highlighting
  useEffect(() => {
    const channelParam = searchParams.get('channel');
    const messageParam = searchParams.get('message');
    
    if (channelParam) {
      setActiveChannelId(channelParam);
    }
    
    if (messageParam) {
      setHighlightedMessageId(messageParam);
      // Scroll to the message after a short delay to ensure it's rendered
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageParam}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 5000);
    }
  }, [searchParams]);

  // Detect scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeChannelId]);

  // Fetch messages for active channel
  const { data: messagesData } = useQuery({
    queryKey: ['group-chat-messages', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return { messages: [] };
      const response = await groupChatApi.getMessages(activeChannelId, { limit: 50 });
      return response.data;
    },
    enabled: !!activeChannelId,
    refetchInterval: 5000, // Poll every 5 seconds (reduced frequency to prevent duplicates)
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  const messages: Message[] = messagesData?.messages || [];

  // Update last message ID when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.id !== lastMessageId) {
        setLastMessageId(latestMessage.id);
        // Mark as read
        if (activeChannelId) {
          groupChatApi.markAsRead(activeChannelId, latestMessage.id);
        }
      }
    }
  }, [messages, lastMessageId, activeChannelId]);

  // Fetch members for active channel
  const { data: membersData } = useQuery({
    queryKey: ['group-chat-members', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return { members: [] };
      const response = await groupChatApi.getMembers(activeChannelId);
      return response.data;
    },
    enabled: !!activeChannelId,
  });

  const members: Member[] = membersData?.members || [];
  
  // Check if current user is admin of the active channel
  const currentUserMember = members.find(m => m.staff_id === user?.id);
  const isChannelAdmin = currentUserMember?.role === 'admin';

  // Fetch all staff for adding members (future feature)
  // const { data: staffData } = useQuery({
  //   queryKey: ['staff'],
  //   queryFn: async () => {
  //     const response = await staffApi.list();
  //     return response.data;
  //   },
  // });
  // const allStaff = staffData?.staff || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; attachments?: any[] }) => {
      if (!activeChannelId) throw new Error('No active channel');
      return groupChatApi.sendMessage(activeChannelId, data);
    },
    onSuccess: () => {
      setMessageInput('');
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages', activeChannelId] });
      queryClient.invalidateQueries({ queryKey: ['group-chat-channels'] });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; channelType?: string }) =>
      groupChatApi.createChannel(data),
    onSuccess: () => {
      setShowNewChannelModal(false);
      setNewChannelName('');
      setNewChannelDescription('');
      queryClient.invalidateQueries({ queryKey: ['group-chat-channels'] });
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content, deleteAttachment }: { messageId: string; content: string; deleteAttachment?: boolean }) =>
      groupChatApi.editMessage(messageId, content, deleteAttachment),
    onSuccess: () => {
      setEditingMessageId(null);
      setDeleteAttachment(false);
      setEditingContent('');
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages', activeChannelId] });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => groupChatApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages', activeChannelId] });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      groupChatApi.addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages', activeChannelId] });
      setShowEmojiPicker(null);
    },
  });

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (sendMessageMutation.isPending) return; // Prevent duplicate sends

    let attachments: any[] = [];

    // Convert files to base64
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const base64 = await fileToBase64(file);
        attachments.push({
          name: file.name,
          content: base64,
          type: file.type,
          size: file.size,
        });
      }
    }

    // If replying, prepend the reply reference to the message with the original message ID
    let finalContent = messageInput;
    if (replyToMessage) {
      finalContent = `↩️ Replying to ${replyToMessage.first_name}: "${replyToMessage.content.substring(0, 50)}${replyToMessage.content.length > 50 ? '...' : ''}" [msg:${replyToMessage.id}]\n\n${messageInput}`;
    }
    
    sendMessageMutation.mutate({
      content: finalContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    
    // Clear reply state
    setReplyToMessage(null);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file download
  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Handle create channel
  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName,
      description: newChannelDescription || undefined,
      channelType: 'public',
    });
  };

  // Get attachment URL
  const getAttachmentUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `https://dartmouth-os-worker.dartmouth.workers.dev/api/attachments/${url}`;
  };

  // Highlight @mentions and linkify ticket numbers
  const highlightMentions = (text: string) => {
    // Split by both @mentions and ticket patterns
    const parts = text.split(/(@\w+|@\d+|#\d+|TKT-\d+|ticket\s+\d+)/gi);
    
    return parts.map((part, index) => {
      // Check if it's an @mention (staff)
      if (part.match(/^@\w+$/) && !part.match(/^@\d+$/)) {
        return (
          <span key={index} className="bg-blue-100 text-blue-700 font-semibold px-1 rounded">
            {part}
          </span>
        );
      }
      
      // Check if it's a ticket reference
      const ticketMatch = part.match(/^@(\d+)$|^#(\d+)$|^TKT-(\d+)$|^ticket\s+(\d+)$/i);
      if (ticketMatch) {
        const ticketNum = ticketMatch[1] || ticketMatch[2] || ticketMatch[3] || ticketMatch[4];
        return (
          <a
            key={index}
            href={`/tickets?search=TKT-${ticketNum}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
          </a>
        );
      }
      
      return part;
    });
  };

  // Render message content with clickable reply references
  const renderMessageContent = (message: Message) => {
    const content = message.content;
    
    // Check if this message contains a reply reference with message ID
    const replyMatch = content.match(/^↩️ Replying to (\w+): "(.+?)" \[msg:([^\]]+)\]\n\n([\s\S]*)$/);
    
    if (replyMatch) {
      const [, replyToName, replyPreview, originalMessageId, actualMessage] = replyMatch;
      
      return (
        <>
          <div className="mb-2 pb-2 border-b border-gray-300">
            <button
              onClick={() => {
                scrollToMessage(originalMessageId);
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              title="Click to view original message"
            >
              <span className="text-base">↩️</span>
              <span>Replying to {replyToName}: "{replyPreview}"</span>
            </button>
          </div>
          <div>{highlightMentions(actualMessage)}</div>
        </>
      );
    }
    
    return highlightMentions(content);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="w-full flex bg-gray-50" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Left Sidebar - Channels */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0" style={{ height: '73px' }}>
          <h1 className="text-xl font-bold text-gray-900">Team Chat</h1>
          <p className="text-sm text-gray-500">Internal Communication</p>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Channels</span>
              {isChannelAdmin && (
                <button
                  onClick={() => setShowNewChannelModal(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Create new channel (Admin only)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors border ${
                  activeChannelId === channel.id
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border-indigo-300'
                    : 'text-gray-700 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">{channel.name}</span>
                {channel.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {channel.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ height: '73px' }}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Hash className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{activeChannel.name}</h2>
                    {activeChannel.description && (
                      <p className="text-sm text-gray-500 truncate">{activeChannel.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">{members.length} members</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-3 relative">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const reactions = message.reactions ? JSON.parse(message.reactions) : [];
                const isEditing = editingMessageId === message.id;
                const isHighlighted = highlightedMessageId === message.id;

                return (
                  <div 
                    key={message.id} 
                    id={`message-${message.id}`}
                    className={`group flex gap-3 -mx-2 px-2 py-1 rounded transition-all duration-300 ${
                      isHighlighted 
                        ? 'bg-yellow-100 border-l-4 border-yellow-500 pl-1' 
                        : 'hover:bg-gray-50'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id });
                    }}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.profile_picture && staffApi.getAvatarUrl(message.profile_picture) ? (
                        <img
                          src={staffApi.getAvatarUrl(message.profile_picture) || ''}
                          alt={`${message.first_name} ${message.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold ${message.profile_picture && staffApi.getAvatarUrl(message.profile_picture) ? 'hidden' : ''}`}>
                        {message.first_name?.[0]}{message.last_name?.[0]}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header: Name + Timestamp + Actions */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {message.first_name} {message.last_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(() => {
                            const messageDate = new Date(message.created_at);
                            const today = new Date();
                            const isToday = messageDate.toDateString() === today.toDateString();
                            
                            if (isToday) {
                              // Today: show only time
                              return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } else {
                              // Previous days: show full date and time
                              return messageDate.toLocaleString([], { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              });
                            }
                          })()}
                        </span>
                        {message.edited_at && (
                          <span className="text-xs text-gray-400 italic" title={`Edited at ${new Date(message.edited_at).toLocaleString()}`}>
                            (edited {new Date(message.edited_at).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })})
                          </span>
                        )}
                        
                        {/* Action buttons (show on hover) */}
                        {isOwnMessage && !isEditing && canEditOrDelete(message) && (
                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingContent(message.content);
                                setDeleteAttachment(false);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                              title="Edit message (within 10 mins)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmMessageId(message.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete message (within 10 mins)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Message bubble or edit form */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            autoFocus
                          />
                          
                          {/* Show attachment with delete option */}
                          {message.attachment_url && !deleteAttachment && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                              {message.attachment_type?.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-gray-500" />
                              ) : (
                                <File className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="text-sm text-gray-700 flex-1">{message.attachment_name}</span>
                              <button
                                onClick={() => setDeleteAttachment(true)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Remove attachment"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          
                          {deleteAttachment && (
                            <div className="text-xs text-gray-500 italic">
                              Attachment will be removed when you save
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                editMessageMutation.mutate({ 
                                  messageId: message.id, 
                                  content: editingContent,
                                  deleteAttachment 
                                });
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent('');
                                setDeleteAttachment(false);
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
                            <div className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                              {renderMessageContent(message)}
                            </div>
                            
                            {/* Attachment */}
                            {message.attachment_url && (
                              <div className="mt-2">
                                {message.attachment_type?.startsWith('image/') ? (
                                  <div className="relative inline-block">
                                    <a
                                      href={getAttachmentUrl(message.attachment_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={getAttachmentUrl(message.attachment_url)}
                                        alt={message.attachment_name || 'Attachment'}
                                        className="max-w-md rounded border border-gray-300"
                                      />
                                    </a>
                                    <button
                                      onClick={() => message.attachment_url && handleDownloadFile(getAttachmentUrl(message.attachment_url), message.attachment_name || 'image.png')}
                                      className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white text-gray-700 hover:text-blue-600 rounded-lg shadow-md border border-gray-200"
                                      title="Download image"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={getAttachmentUrl(message.attachment_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                    >
                                      <File className="w-4 h-4" />
                                      <span>{message.attachment_name}</span>
                                      {message.attachment_size && (
                                        <span className="text-xs text-gray-500">
                                          ({(message.attachment_size / 1024).toFixed(1)} KB)
                                        </span>
                                      )}
                                    </a>
                                    <button
                                      onClick={() => message.attachment_url && handleDownloadFile(getAttachmentUrl(message.attachment_url), message.attachment_name || 'download')}
                                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Emoji Reactions */}
                          <div className="flex items-center gap-2 mt-1">
                            {/* Show existing reactions */}
                            {reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(
                                  reactions.reduce((acc: any, r: any) => {
                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                    return acc;
                                  }, {})
                                ).map(([emoji, count]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-xs"
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-blue-600 font-medium">{count as number}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Add reaction button */}
                            <div className="relative">
                              <button
                                onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                title="Add reaction"
                              >
                                <Smile className="w-4 h-4" />
                              </button>

                              {/* Emoji picker */}
                              {showEmojiPicker === message.id && (
                                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                  {['👍', '👎', '😊', '😢', '❤️', '😠', '💯'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                                      className="text-2xl hover:bg-gray-100 rounded p-1"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll to Bottom Button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-28 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 z-50"
                title="Scroll to bottom"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}

            {/* Message Input */}
            <div className="bg-white p-4">
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <File className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        onClick={() =>
                          setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
                        }
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Reply Preview */}
              {replyToMessage && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-l-4 border-blue-500">
                  <div className="flex-1">
                    <div className="text-xs text-blue-600 font-semibold">
                      Replying to {replyToMessage.first_name} {replyToMessage.last_name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {replyToMessage.content}
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMessageInput(value);
                      
                      // Detect @ mentions
                      const cursorPos = e.target.selectionStart || 0;
                      const textBeforeCursor = value.substring(0, cursorPos);
                      const atMatch = textBeforeCursor.match(/@(\w*)$/);
                      
                      if (atMatch) {
                        setMentionSearch(atMatch[1].toLowerCase());
                        setMentionCursorPosition(cursorPos);
                        setShowMentionSuggestions(true);
                      } else {
                        setShowMentionSuggestions(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showMentionSuggestions) {
                        e.preventDefault();
                        handleSendMessage();
                      } else if (e.key === 'Escape' && showMentionSuggestions) {
                        setShowMentionSuggestions(false);
                      }
                    }}
                    placeholder="Type a message... (use @ to mention someone)"
                    className="w-full px-4 h-[42px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Mention Suggestions Dropdown */}
                  {showMentionSuggestions && members.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {members
                        .filter(member => {
                          const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
                          const firstName = member.first_name.toLowerCase();
                          return fullName.includes(mentionSearch) || firstName.includes(mentionSearch);
                        })
                        .map(member => (
                          <button
                            key={member.staff_id}
                            onClick={() => {
                              const textBefore = messageInput.substring(0, mentionCursorPosition).replace(/@\w*$/, '');
                              const textAfter = messageInput.substring(mentionCursorPosition);
                              const newText = `${textBefore}@${member.first_name.toLowerCase()} ${textAfter}`;
                              setMessageInput(newText);
                              setShowMentionSuggestions(false);
                              messageInputRef.current?.focus();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                          >
                            {member.avatar_url && staffApi.getAvatarUrl(member.avatar_url) ? (
                              <img
                                src={staffApi.getAvatarUrl(member.avatar_url) || ''}
                                alt={`${member.first_name} ${member.last_name}`}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold ${member.avatar_url && staffApi.getAvatarUrl(member.avatar_url) ? 'hidden' : ''}`}>
                              {member.first_name[0]}{member.last_name[0]}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{member.first_name} {member.last_name}</div>
                              <div className="text-xs text-gray-500">@{member.first_name.toLowerCase()}</div>
                            </div>
                          </button>
                        ))}
                      {/* McCarthy AI Option */}
                      {('mccarthy'.includes(mentionSearch) || 'mc'.includes(mentionSearch)) && (
                        <button
                          onClick={() => {
                            const textBefore = messageInput.substring(0, mentionCursorPosition).replace(/@\w*$/, '');
                            const textAfter = messageInput.substring(mentionCursorPosition);
                            const newText = `${textBefore}@mccarthy ${textAfter}`;
                            setMessageInput(newText);
                            setShowMentionSuggestions(false);
                            messageInputRef.current?.focus();
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                            AI
                          </div>
                          <div>
                            <div className="font-medium text-sm">McCarthy AI</div>
                            <div className="text-xs text-gray-500">@mccarthy</div>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageInput.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending}
                  className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[42px]"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Hash className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No channel selected</p>
              <p className="text-sm">Select a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Members */}
      {showMembersPanel && activeChannel && (
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0" style={{ height: '73px' }}>
            <h3 className="font-semibold text-gray-900">Members</h3>
            <p className="text-sm text-gray-500">{members.length} in this channel</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="relative">
                  {member.avatar_url && staffApi.getAvatarUrl(member.avatar_url) ? (
                    <img
                      src={staffApi.getAvatarUrl(member.avatar_url) || ''}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold ${member.avatar_url && staffApi.getAvatarUrl(member.avatar_url) ? 'hidden' : ''}`}>
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  {member.availability_status === 'available' && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.first_name} {member.last_name}
                  </p>
                  {member.role === 'admin' && (
                    <span className="text-xs text-blue-600">Admin</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., general, support, sales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="What is this channel for?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewChannelModal(false);
                  setNewChannelName('');
                  setNewChannelDescription('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmMessageId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmMessageId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMessageMutation.mutate(deleteConfirmMessageId);
                  setDeleteConfirmMessageId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const message = messages.find(m => m.id === contextMenu.messageId);
              if (message) {
                setReplyToMessage(message);
                setContextMenu(null);
                messageInputRef.current?.focus();
              }
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span>💬</span> Reply
          </button>
          <button
            onClick={() => {
              setShareMessageId(contextMenu.messageId);
              setShowShareModal(true);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span>📤</span> Share
          </button>
          <button
            onClick={() => {
              const message = messages.find(m => m.id === contextMenu.messageId);
              if (message) {
                navigator.clipboard.writeText(message.content);
                setContextMenu(null);
              }
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span>📋</span> Copy Message
          </button>
        </div>
      )}

      {/* Share Message Modal */}
      {showShareModal && shareMessageId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Message</h3>
            
            {!shareToChannelId ? (
              <>
                <p className="text-sm text-gray-600 mb-4">Select where to share this message:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {/* Group Chat Channels */}
                  {channels
                    .filter(ch => ch.id !== activeChannelId)
                    .map(channel => (
                      <button
                        key={channel.id}
                        onClick={() => setShareToChannelId(channel.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded border border-gray-200 flex items-center gap-2"
                      >
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span>{channel.name}</span>
                      </button>
                    ))}
                  
                  {/* @Memos Option - At Bottom */}
                  <button
                    onClick={() => setShareToChannelId('MEMOS')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded border border-gray-200 flex items-center gap-2"
                  >
                    <StickyNote className="w-4 h-4 text-yellow-600" />
                    <span>@Memos (Personal notes)</span>
                  </button>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setShareMessageId(null);
                      setShareToChannelId(null);
                      setShareComment('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Sharing to: <span className="font-semibold">
                      {shareToChannelId === 'MEMOS' ? '@Memos' : `#${channels.find(c => c.id === shareToChannelId)?.name}`}
                    </span>
                  </p>
                  
                  {/* Original Message Preview */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Original message:</p>
                    <p className="text-sm text-gray-900 line-clamp-3">
                      {messages.find(m => m.id === shareMessageId)?.content}
                    </p>
                    {messages.find(m => m.id === shareMessageId)?.attachment_name && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                        <Paperclip className="w-3 h-3" />
                        <span>{messages.find(m => m.id === shareMessageId)?.attachment_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Add Your Comment */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {shareToChannelId === 'MEMOS' 
                      ? 'Add your note (optional):' 
                      : 'Add your comment (optional - use @ to mention someone):'}
                  </label>
                  <textarea
                    value={shareComment}
                    onChange={(e) => setShareComment(e.target.value)}
                    placeholder={shareToChannelId === 'MEMOS' 
                      ? 'Add a note about this shared message...' 
                      : '@gaille can you review this?'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShareToChannelId(null);
                      setShareComment('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      const message = messages.find(m => m.id === shareMessageId);
                      if (message && activeChannelId && shareToChannelId && user) {
                        // Handle sharing to @Memos
                        if (shareToChannelId === 'MEMOS') {
                          const originalChannelName = channels.find(c => c.id === activeChannelId)?.name;
                          let memoContent = '';
                          
                          // Build the memo content
                          if (shareComment.trim()) {
                            memoContent = `${shareComment}\n\n📤 Shared from #${originalChannelName}:\n${message.content}`;
                          } else {
                            memoContent = `📤 Shared from #${originalChannelName}:\n\n${message.content}`;
                          }
                          
                          // Prepare attachment if the original message has one
                          let attachmentData: { name: string; data: string; type: string; size: number } | undefined = undefined;
                          if (message.attachment_url && message.attachment_name) {
                            try {
                              const response = await fetch(getAttachmentUrl(message.attachment_url));
                              const blob = await response.blob();
                              const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                              });
                              
                              attachmentData = {
                                name: message.attachment_name,
                                data: base64,
                                type: message.attachment_type || 'application/octet-stream',
                                size: message.attachment_size || 0,
                              };
                            } catch (error) {
                              console.error('Error fetching attachment:', error);
                            }
                          }
                          
                          // Create the memo
                          console.log('[Share to Memos] Creating memo with:', { content: memoContent, attachment: attachmentData });
                          memosApi.createMemo({
                            content: memoContent,
                            attachment: attachmentData,
                          }).then(() => {
                            setShowShareModal(false);
                            setShareMessageId(null);
                            setShareToChannelId(null);
                            setShareComment('');
                            queryClient.invalidateQueries({ queryKey: ['memos'] });
                          }).catch((error) => {
                            console.error('Error creating memo:', error);
                            alert('Failed to share to @Memos. Please try again.');
                          });
                        } else {
                          // Handle sharing to Group Chat channel
                          const originalChannelName = channels.find(c => c.id === activeChannelId)?.name;
                          const sharedByName = `${user.firstName} ${user.lastName}`;
                          let shareContent = '';
                          
                          // Build the share message with who shared it
                          if (shareComment.trim()) {
                            shareContent = `${shareComment}\n\n📤 ${sharedByName} shared from #${originalChannelName}:\n${message.content}`;
                          } else {
                            shareContent = `📤 ${sharedByName} shared from #${originalChannelName}:\n\n${message.content}`;
                          }
                          
                          // Prepare attachments if the original message has them
                          let attachments: any[] | undefined = undefined;
                          if (message.attachment_url && message.attachment_name) {
                            // Fetch the attachment and convert to base64
                            try {
                              const response = await fetch(getAttachmentUrl(message.attachment_url));
                              const blob = await response.blob();
                              const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                              });
                              
                              attachments = [{
                                name: message.attachment_name,
                                content: base64,
                                type: message.attachment_type || 'application/octet-stream',
                                size: message.attachment_size || 0,
                              }];
                            } catch (error) {
                              console.error('Error fetching attachment:', error);
                            }
                          }
                          
                          groupChatApi.sendMessage(shareToChannelId, {
                            content: shareContent,
                            attachments,
                          }).then(() => {
                            setShowShareModal(false);
                            setShareMessageId(null);
                            setShareToChannelId(null);
                            setShareComment('');
                            queryClient.invalidateQueries({ queryKey: ['group-chat-channels'] });
                          }).catch((error) => {
                            console.error('Error sharing message:', error);
                            alert('Failed to share message. Please try again.');
                          });
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Share
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

