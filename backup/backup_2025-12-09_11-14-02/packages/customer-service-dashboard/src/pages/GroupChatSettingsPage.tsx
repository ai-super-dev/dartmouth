import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupChatApi, staffApi } from '../lib/api';
import { Hash, Users, Settings, Trash2, Edit2, UserPlus, X, Plus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  created_by: string;
  created_at: string;
  is_archived: number;
}

interface Member {
  id: string;
  staff_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function GroupChatSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'channels' | 'global' | 'mentions'>('channels');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [allowMessageEditing, setAllowMessageEditing] = useState(true);
  const [allowMessageDeletion, setAllowMessageDeletion] = useState(true);
  const [allowFileDeletion, setAllowFileDeletion] = useState(true);
  const [globalTimeLimit, setGlobalTimeLimit] = useState<number>(10);
  const [autoArchiveHours, setAutoArchiveHours] = useState<number>(12);

  // Fetch all channels
  const { data: channelsData } = useQuery({
    queryKey: ['group-chat-channels-settings'],
    queryFn: async () => {
      const response = await groupChatApi.listChannels();
      return response.data;
    },
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

  // Update globalTimeLimit when data is fetched
  useState(() => {
    if (timeLimitData?.timeLimit !== undefined) {
      setGlobalTimeLimit(timeLimitData.timeLimit);
    }
  });

  // Update time limit mutation
  const updateTimeLimitMutation = useMutation({
    mutationFn: (timeLimit: number) => groupChatApi.setTimeLimit(timeLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-time-limit'] });
    },
  });

  // Fetch auto-archive hours
  const { data: autoArchiveData } = useQuery({
    queryKey: ['mentions-auto-archive'],
    queryFn: async () => {
      const response = await groupChatApi.getAutoArchiveHours();
      return response.data;
    },
  });

  // Update autoArchiveHours when data is fetched
  useState(() => {
    if (autoArchiveData?.hours !== undefined) {
      setAutoArchiveHours(autoArchiveData.hours);
    }
  });

  // Update auto-archive mutation
  const updateAutoArchiveMutation = useMutation({
    mutationFn: (hours: number) => groupChatApi.setAutoArchiveHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions-auto-archive'] });
    },
  });

  // Fetch members for selected channel
  const { data: membersData } = useQuery({
    queryKey: ['group-chat-members-settings', selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel) return { members: [] };
      const response = await groupChatApi.getMembers(selectedChannel.id);
      return response.data;
    },
    enabled: !!selectedChannel,
  });

  const members: Member[] = membersData?.members || [];

  // Fetch all staff
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const response = await staffApi.list();
      return response.data;
    },
  });

  const allStaff: StaffMember[] = staffData?.staff || [];

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: (data: { 
      channelId: string; 
      name: string; 
      description: string;
      allow_message_editing?: boolean;
      allow_message_deletion?: boolean;
      allow_file_deletion?: boolean;
    }) =>
      groupChatApi.updateChannel(data.channelId, { 
        name: data.name, 
        description: data.description,
        allow_message_editing: data.allow_message_editing,
        allow_message_deletion: data.allow_message_deletion,
        allow_file_deletion: data.allow_file_deletion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-channels-settings'] });
      setShowEditModal(false);
      setSelectedChannel(null);
    },
  });

  // Archive channel mutation
  const archiveChannelMutation = useMutation({
    mutationFn: (channelId: string) => groupChatApi.archiveChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-channels-settings'] });
      setSelectedChannel(null);
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (data: { channelId: string; staffId: string }) =>
      groupChatApi.addMember(data.channelId, data.staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-members-settings', selectedChannel?.id] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (data: { channelId: string; staffId: string }) =>
      groupChatApi.removeMember(data.channelId, data.staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-members-settings', selectedChannel?.id] });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; channelType?: string }) =>
      groupChatApi.createChannel(data),
    onSuccess: () => {
      setShowCreateModal(false);
      setNewChannelName('');
      setNewChannelDescription('');
      queryClient.invalidateQueries({ queryKey: ['group-chat-channels-settings'] });
    },
  });

  const handleSaveEdit = () => {
    if (!selectedChannel || !editName.trim()) return;
    updateChannelMutation.mutate({
      channelId: selectedChannel.id,
      name: editName,
      description: editDescription,
      allow_message_editing: allowMessageEditing,
      allow_message_deletion: allowMessageDeletion,
      allow_file_deletion: allowFileDeletion,
    });
  };

  const handleAddMember = (staffId: string) => {
    if (!selectedChannel) return;
    addMemberMutation.mutate({ channelId: selectedChannel.id, staffId });
  };

  const handleRemoveMember = (staffId: string) => {
    if (!selectedChannel) return;
    if (confirm('Are you sure you want to remove this member from the channel?')) {
      removeMemberMutation.mutate({ channelId: selectedChannel.id, staffId });
    }
  };

  const availableStaff = allStaff.filter(
    (staff) => !members.some((member) => member.staff_id === staff.id)
  );

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName,
      description: newChannelDescription || undefined,
      channelType: 'public',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Group Chat Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage channels, members, and group chat configuration
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'channels'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Hash className="w-4 h-4 inline-block mr-2" />
            Channels
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'global'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Global Settings
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mentions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            @Mentions
          </button>
        </nav>
      </div>

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <>
          {/* Create Channel Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Channel
            </button>
          </div>

          {/* Channels List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Channels
              </h2>
              {channels.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No channels yet. Create one to get started!</p>
              ) : (
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          {channel.name}
                          {channel.is_archived === 1 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Archived</span>
                          )}
                        </h3>
                        {channel.description && (
                          <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedChannel(channel);
                            setShowMembersModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Manage Members"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedChannel(channel);
                            setEditName(channel.name);
                            setEditDescription(channel.description || '');
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Channel"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {channel.is_archived === 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Archive channel "${channel.name}"?`)) {
                                archiveChannelMutation.mutate(channel.id);
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Archive Channel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Global Settings Tab */}
      {activeTab === 'global' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edit/Delete Time Limit
              </label>
              <p className="text-xs text-gray-500 mb-3">
                How long staff members can edit or delete their messages. Admins can always edit/delete.
              </p>
              <select
                value={globalTimeLimit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value, 10);
                  setGlobalTimeLimit(newLimit);
                  updateTimeLimitMutation.mutate(newLimit);
                }}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes (default)</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>No limit (always allow)</option>
              </select>
              {updateTimeLimitMutation.isPending && (
                <p className="text-xs text-gray-500 mt-2">Saving...</p>
              )}
              {updateTimeLimitMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2">✓ Saved successfully</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* @Mentions Tab */}
      {activeTab === 'mentions' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            @Mentions Settings
          </h2>
          <div className="space-y-4">
            {/* Auto Archive Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Archive Mentions
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Automatically archive Read mentions after the specified time. This keeps your Mentions page clean and focused on active items.
              </p>
              <select
                value={autoArchiveHours}
                onChange={(e) => {
                  const newHours = parseInt(e.target.value, 10);
                  setAutoArchiveHours(newHours);
                  updateAutoArchiveMutation.mutate(newHours);
                }}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={12}>12 Hours (default)</option>
                <option value={24}>24 Hours</option>
                <option value={36}>36 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={72}>72 Hours</option>
                <option value={0}>Never Archive</option>
              </select>
              {updateAutoArchiveMutation.isPending && (
                <p className="text-xs text-gray-500 mt-2">Saving...</p>
              )}
              {updateAutoArchiveMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2">✓ Saved successfully</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {showEditModal && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Channel Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Channel Permissions</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Allow Message Editing</span>
                      <p className="text-xs text-gray-500">Members can edit their own messages</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowMessageEditing}
                      onChange={(e) => setAllowMessageEditing(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Allow Message Deletion</span>
                      <p className="text-xs text-gray-500">Members can delete their own messages</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowMessageDeletion}
                      onChange={(e) => setAllowMessageDeletion(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Allow File Deletion</span>
                      <p className="text-xs text-gray-500">Members can delete attached files</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowFileDeletion}
                      onChange={(e) => setAllowFileDeletion(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedChannel(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
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
                  setShowCreateModal(false);
                  setNewChannelName('');
                  setNewChannelDescription('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || createChannelMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createChannelMutation.isPending ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Members - #{selectedChannel.name}
              </h3>
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedChannel(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Members */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Current Members ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Admin
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.staff_id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Remove member"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Members */}
            {availableStaff.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Add Members ({availableStaff.length} available)
                </h4>
                <div className="space-y-2">
                  {availableStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
                          {staff.first_name?.[0]}{staff.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {staff.first_name} {staff.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{staff.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(staff.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availableStaff.length === 0 && members.length > 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                All staff members are already in this channel
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

