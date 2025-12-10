import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Bot, User, CheckCircle, XCircle, Clock, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface TaskManagerChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextType?: 'general' | 'task' | 'project';
  contextId?: string;
}

interface Message {
  id: string;
  sender_type: 'staff' | 'task_manager_ai';
  content: string;
  action_type?: string;
  action_data?: any;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

interface Action {
  id: string;
  action_type: string;
  action_data: any;
  status: string;
  requires_confirmation: number;
  created_at: string;
}

export default function TaskManagerChatPanel({
  isOpen,
  onClose,
  contextType = 'general',
  contextId,
}: TaskManagerChatPanelProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get or create conversation
  const { data: conversationsData } = useQuery({
    queryKey: ['task-manager-conversations'],
    queryFn: async () => {
      const response = await api.get('/api/task-manager/conversations');
      return response.data;
    },
    enabled: isOpen,
  });

  // Get conversation messages
  const { data: conversationData, isLoading } = useQuery({
    queryKey: ['task-manager-conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await api.get(`/api/task-manager/conversations/${conversationId}`);
      return response.data;
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Get quick suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ['task-manager-suggestions'],
    queryFn: async () => {
      const response = await api.get('/api/task-manager/suggestions');
      return response.data;
    },
    enabled: isOpen,
  });

  // Get pending actions
  const { data: actionsData } = useQuery({
    queryKey: ['task-manager-actions', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await api.get(`/api/task-manager/conversations/${conversationId}/actions`);
      return response.data;
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await api.post('/api/task-manager/chat', {
        message: messageText,
        conversationId,
        contextType,
        contextId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.response?.metadata?.conversationId) {
        setConversationId(data.response.metadata.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ['task-manager-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['task-manager-actions', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['task-manager-conversations'] });
      setMessage('');
    },
  });

  // Execute action mutation
  const executeActionMutation = useMutation({
    mutationFn: async ({ actionId, confirmed }: { actionId: string; confirmed: boolean }) => {
      const response = await api.post(`/api/task-manager/actions/${actionId}/execute`, {
        confirmed,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-manager-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['task-manager-actions', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Auto-select or create conversation
  useEffect(() => {
    if (isOpen && conversationsData?.conversations && !conversationId) {
      const conversations = conversationsData.conversations;
      if (conversations.length > 0) {
        // Use the most recent conversation
        setConversationId(conversations[0].id);
      } else {
        // Create a new conversation
        api.post('/api/task-manager/conversations', {
          title: 'New Conversation',
          contextType,
          contextId,
        }).then((response) => {
          setConversationId(response.data.conversation.id);
        });
      }
    }
  }, [isOpen, conversationsData, conversationId, contextType, contextId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationData?.messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  const handleExecuteAction = (actionId: string, requiresConfirmation: boolean) => {
    if (requiresConfirmation) {
      if (window.confirm('Are you sure you want to execute this action?')) {
        executeActionMutation.mutate({ actionId, confirmed: true });
      }
    } else {
      executeActionMutation.mutate({ actionId, confirmed: false });
    }
  };

  const messages: Message[] = conversationData?.messages || [];
  const suggestions: string[] = suggestionsData?.suggestions || [];
  const pendingActions: Action[] = actionsData?.actions || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Task Manager AI</h2>
            <p className="text-xs text-blue-100">Your intelligent task assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-16 h-16 text-blue-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Task Manager AI!
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-xs">
              I can help you create, manage, and track tasks. Ask me anything!
            </p>
            <div className="space-y-2 w-full">
              {suggestions.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender_type === 'task_manager_ai' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    msg.sender_type === 'staff'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_type === 'staff' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
                {msg.sender_type === 'staff' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pending Actions */}
            {pendingActions.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Actions
                </p>
                <div className="space-y-2">
                  {pendingActions.map((action) => (
                    <div
                      key={action.id}
                      className="bg-white rounded p-2 border border-yellow-300"
                    >
                      <p className="text-xs font-medium text-gray-900 mb-1">
                        {action.action_type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        {JSON.stringify(action.action_data, null, 2)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExecuteAction(action.id, action.requires_confirmation === 1)}
                          disabled={executeActionMutation.isPending}
                          className="flex-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Execute
                        </button>
                        <button
                          className="flex-1 text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sendMessageMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Suggestions */}
      {messages.length > 0 && suggestions.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-white">
          <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Task Manager AI..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sendMessageMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

