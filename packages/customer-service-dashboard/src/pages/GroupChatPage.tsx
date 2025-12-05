import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupChatApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Hash, Plus, Send, Paperclip, Users, X, Image as ImageIcon, File } from 'lucide-react';

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
  first_name: string;
  last_name: string;
  email: string;
}

interface Member {
  id: string;
  staff_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  availability_status: string;
}

export default function GroupChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

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

  // Set first channel as active if none selected
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Fetch messages for active channel
  const { data: messagesData } = useQuery({
    queryKey: ['group-chat-messages', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return { messages: [] };
      const response = await groupChatApi.getMessages(activeChannelId, { limit: 50 });
      return response.data;
    },
    enabled: !!activeChannelId,
    refetchInterval: 2000, // Poll every 2 seconds
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

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

    sendMessageMutation.mutate({
      content: messageInput,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
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

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Channels */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Team Chat</h1>
          <p className="text-sm text-gray-500">Internal Communication</p>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Channels</span>
              <button
                onClick={() => setShowNewChannelModal(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeChannelId === channel.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
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
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">{activeChannel.name}</h2>
                </div>
                {activeChannel.description && (
                  <p className="text-sm text-gray-500 mt-1">{activeChannel.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowMembersPanel(!showMembersPanel)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">{members.length} members</span>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {message.first_name?.[0]}{message.last_name?.[0]}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 max-w-2xl ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {message.first_name} {message.last_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                        {message.edited_at && (
                          <span className="text-xs text-gray-400 italic">(edited)</span>
                        )}
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        {message.attachment_url && (
                          <div className="mt-2">
                            {message.attachment_type?.startsWith('image/') ? (
                              <a
                                href={getAttachmentUrl(message.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={getAttachmentUrl(message.attachment_url)}
                                  alt={message.attachment_name || 'Attachment'}
                                  className="max-w-sm rounded-lg border border-gray-300"
                                />
                              </a>
                            ) : (
                              <a
                                href={getAttachmentUrl(message.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm hover:underline"
                              >
                                <File className="w-4 h-4" />
                                <span>{message.attachment_name}</span>
                                {message.attachment_size && (
                                  <span className="text-xs opacity-75">
                                    ({(message.attachment_size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
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
              <div className="flex items-end gap-2">
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
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() && selectedFiles.length === 0}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send</span>
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
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Members</h3>
            <p className="text-sm text-gray-500">{members.length} in this channel</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

