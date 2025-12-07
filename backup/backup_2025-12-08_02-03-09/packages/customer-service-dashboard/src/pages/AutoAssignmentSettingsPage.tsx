import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoAssignmentApi } from '../lib/api';
import { ArrowPathIcon, PlayIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AutoAssignConfig {
  enabled: boolean;
  maxAssignedTickets: number;
  refillThreshold: number;
  priorityOrder: 'priority_first' | 'oldest_first' | 'newest_first';
  channels: string[];
  businessHoursOnly: boolean;
}

interface AssignmentHistoryItem {
  id: string;
  ticket_id: string;
  ticket_number: string;
  assigned_to: string;
  assigned_at: string;
  reason: string;
  staff_ticket_count: number;
  staff_first_name: string;
  staff_last_name: string;
}

export default function AutoAssignmentSettingsPage() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AutoAssignConfig>({
    enabled: false,
    maxAssignedTickets: 8,
    refillThreshold: 3,
    priorityOrder: 'priority_first',
    channels: ['email', 'chat'],
    businessHoursOnly: true,
  });

  // Fetch current config
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['autoAssignmentConfig'],
    queryFn: async () => {
      const response = await autoAssignmentApi.getConfig();
      return response.data;
    },
  });

  // Fetch assignment history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['autoAssignmentHistory'],
    queryFn: async () => {
      const response = await autoAssignmentApi.getHistory(50);
      return response.data;
    },
  });

  // Update config when data loads
  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config);
    }
  }, [configData]);

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<AutoAssignConfig>) => 
      autoAssignmentApi.updateConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignmentConfig'] });
    },
  });

  // Run now mutation
  const runNowMutation = useMutation({
    mutationFn: () => autoAssignmentApi.runNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignmentHistory'] });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const handleRunNow = () => {
    runNowMutation.mutate();
  };

  const handleChannelToggle = (channel: string) => {
    const newChannels = config.channels.includes(channel)
      ? config.channels.filter(c => c !== channel)
      : [...config.channels, channel];
    setConfig({ ...config, channels: newChannels });
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Auto-Assignment Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure automatic ticket assignment to online staff members
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Auto-Assignment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically assign unassigned tickets to online staff
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Assigned Tickets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Tickets per Staff
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.maxAssignedTickets}
              onChange={(e) => setConfig({ ...config, maxAssignedTickets: parseInt(e.target.value) || 8 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum tickets auto-assigned per staff member
            </p>
          </div>

          {/* Refill Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refill Threshold
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={config.refillThreshold}
              onChange={(e) => setConfig({ ...config, refillThreshold: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Auto-assign more when staff drops below this count
            </p>
          </div>

          {/* Priority Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Priority
            </label>
            <select
              value={config.priorityOrder}
              onChange={(e) => setConfig({ ...config, priorityOrder: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="priority_first">High Priority First</option>
              <option value="oldest_first">Oldest First (FIFO)</option>
              <option value="newest_first">Newest First</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Order in which unassigned tickets are assigned
            </p>
          </div>

          {/* Business Hours Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Hours Only
            </label>
            <label className="relative inline-flex items-center cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={config.businessHoursOnly}
                onChange={(e) => setConfig({ ...config, businessHoursOnly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                Only assign during business hours
              </span>
            </label>
          </div>
        </div>

        {/* Channels */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Channels to Auto-Assign
          </label>
          <div className="flex gap-4">
            {['email', 'chat', 'phone'].map((channel) => (
              <label key={channel} className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.channels.includes(channel)}
                  onChange={() => handleChannelToggle(channel)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {channel}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </button>
          
          <button
            onClick={handleRunNow}
            disabled={runNowMutation.isPending || !config.enabled}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {runNowMutation.isPending ? (
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4 mr-2" />
            )}
            Run Now
          </button>
        </div>

        {/* Run Now Result */}
        {runNowMutation.isSuccess && runNowMutation.data && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ {runNowMutation.data.data.message}
            </p>
            {runNowMutation.data.data.results?.length > 0 && (
              <ul className="mt-2 text-sm text-green-700 dark:text-green-300">
                {runNowMutation.data.data.results.map((r: any, i: number) => (
                  <li key={i}>
                    • {r.ticketNumber} → {r.staffName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {updateMutation.isSuccess && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Settings saved successfully
            </p>
          </div>
        )}
      </div>

      {/* Assignment History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Assignment History
          </h3>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['autoAssignmentHistory'] })}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : historyData?.history?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff Queue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {historyData.history.map((item: AssignmentHistoryItem) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.ticket_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {item.staff_first_name} {item.staff_last_name || ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.reason === 'auto_refill' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {item.reason === 'auto_refill' ? 'Refill' : 'Initial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {item.staff_ticket_count} tickets
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.assigned_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No auto-assignments yet</p>
            <p className="text-sm mt-1">
              Enable auto-assignment and assignments will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

