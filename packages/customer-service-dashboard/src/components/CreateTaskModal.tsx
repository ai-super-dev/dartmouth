import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Hash, AtSign, CheckSquare, AlertCircle } from 'lucide-react';
import { api, staffApi, groupChatApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  relatedTicketId?: string;
  relatedTicketNumber?: string;
}

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  relatedTicketId,
  relatedTicketNumber 
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [notifyChannel, setNotifyChannel] = useState(true);
  const [error, setError] = useState('');

  // Fetch staff list for mentions
  const { data: staffData } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const response = await staffApi.list();
      return response.data;
    },
  });

  // Fetch channels for dropdown
  const { data: channelsData } = useQuery({
    queryKey: ['group-chat-channels'],
    queryFn: async () => {
      const response = await groupChatApi.listChannels();
      return response.data;
    },
  });

  const allStaff = staffData?.staff || [];
  const channels = channelsData?.channels || [];

  // Add special mention options
  const mentionOptions = [
    { id: '@all', name: 'All Staff', type: 'special' },
    { id: '@managers', name: 'All Managers', type: 'special' },
    { id: '@admins', name: 'All Admins', type: 'special' },
    ...allStaff.map((staff: any) => ({
      id: staff.id,
      name: `${staff.firstName} ${staff.lastName}`,
      email: staff.email,
      type: 'staff'
    }))
  ];

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await api.post('/api/tasks', taskData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // If a channel is selected and notify is enabled, post to channel
      if (selectedChannel && notifyChannel) {
        const mentionsText = selectedMentions.length > 0 
          ? selectedMentions.map(id => {
              const option = mentionOptions.find(opt => opt.id === id);
              return option?.type === 'special' ? option.id : `@${option?.name}`;
            }).join(' ')
          : '';
        
        const message = `📋 **New Task Created**\n\n**${title}**\n${description}\n\n${mentionsText}`;
        
        groupChatApi.sendMessage(selectedChannel, { content: message });
      }
      
      handleClose();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      channel_id: selectedChannel || null,
      mentions: selectedMentions,
      related_ticket_id: relatedTicketId || null,
      created_by: user?.id,
    };

    createTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setDueDate('');
    setAssignedTo('');
    setSelectedChannel('');
    setSelectedMentions([]);
    setNotifyChannel(true);
    setError('');
    onClose();
  };

  const toggleMention = (mentionId: string) => {
    setSelectedMentions(prev => 
      prev.includes(mentionId) 
        ? prev.filter(id => id !== mentionId)
        : [...prev, mentionId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Task
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Related Ticket Info */}
          {relatedTicketNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Related to Ticket</p>
                <p className="text-blue-700">{relatedTicketNumber}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide task details..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {allStaff.map((staff: any) => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Notify Channel
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None - Don't post to channel</option>
              {channels.map((channel: any) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a Group Chat channel to post a notification about this task
            </p>
          </div>

          {/* Mentions Selection */}
          {selectedChannel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AtSign className="w-4 h-4 inline mr-1" />
                Mention Staff
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {mentionOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMentions.includes(option.id)}
                        onChange={() => toggleMention(option.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {option.type === 'special' ? (
                          <span className="font-medium text-blue-600">{option.id}</span>
                        ) : (
                          <>
                            <span className="font-medium">{option.name}</span>
                            {option.email && (
                              <span className="text-gray-500 ml-1">({option.email})</span>
                            )}
                          </>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Selected staff will be mentioned in the channel notification
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

