import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Bot, Activity, Clock, CheckCircle, AlertTriangle, ArrowLeft, Search, Filter } from 'lucide-react'
import { api } from '../lib/api'

export default function TaskAgentStatusPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')

  // Fetch agent settings
  const { data: settings } = useQuery({
    queryKey: ['task-manager-settings'],
    queryFn: async () => {
      const response = await api.get('/api/settings/task-manager')
      return response.data
    },
  })

  // Fetch agent activity log from group chat messages in Task channel
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['task-agent-activity'],
    queryFn: async () => {
      const response = await api.get('/api/group-chat/messages', {
        params: { 
          channel: 'task',
          limit: 500
        }
      })
      // Filter for messages from McCarthy AI (system user or specific staff ID)
      const messages = response.data.messages || []
      return messages.filter((m: any) => 
        m.sender_name === 'McCarthy AI' || 
        m.sender_name === 'Task Manager Agent' ||
        m.content?.includes('📢') || // Agent notifications
        m.content?.includes('⏰') || // Reminders
        m.content?.includes('🚨') || // Escalations
        m.content?.includes('✅')    // Completions
      )
    },
    refetchInterval: 30000,
  })

  const activities = activityData || []

  // Parse activity type from message content
  const getActivityType = (content: string) => {
    if (content.includes('⏰') || content.toLowerCase().includes('reminder')) return 'reminder'
    if (content.includes('🚨') || content.toLowerCase().includes('escalat')) return 'escalation'
    if (content.includes('✅') || content.toLowerCase().includes('completed')) return 'completion'
    if (content.includes('📢') || content.toLowerCase().includes('note added')) return 'notification'
    return 'other'
  }

  // Filter activities
  const filteredActivities = activities.filter((activity: any) => {
    const matchesSearch = !searchTerm || 
      activity.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const activityType = getActivityType(activity.content || '')
    const matchesFilter = actionFilter === 'all' || activityType === actionFilter

    return matchesSearch && matchesFilter
  })

  // Calculate stats
  const totalActions = activities.length
  const reminders = activities.filter((a: any) => getActivityType(a.content || '') === 'reminder').length
  const escalations = activities.filter((a: any) => getActivityType(a.content || '') === 'escalation').length
  const completions = activities.filter((a: any) => getActivityType(a.content || '') === 'completion').length
  const notifications = activities.filter((a: any) => getActivityType(a.content || '') === 'notification').length

  // Agent status
  const agentEnabled = settings?.agent_enabled !== false
  const lastActivity = activities.length > 0 ? new Date(activities[0].created_at) : null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/task-manager"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            Task Manager Agent Status & Activity
          </h1>
          <p className="text-sm text-gray-600 mt-1">Monitor agent performance and activity log</p>
        </div>

        {/* Agent Status Card */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Agent Status
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${agentEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`text-lg font-semibold ${agentEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {agentEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Last Activity</p>
                <p className="text-lg font-semibold text-gray-900">
                  {lastActivity ? lastActivity.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }) : 'No activity'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Total Actions</p>
                <p className="text-lg font-semibold text-gray-900">{totalActions}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Settings</p>
                <Link
                  to="/settings/task-manager"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Configure Agent →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Reminders Sent</p>
                <p className="text-2xl font-bold text-gray-900">{reminders}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Escalations</p>
                <p className="text-2xl font-bold text-gray-900">{escalations}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completions</p>
                <p className="text-2xl font-bold text-gray-900">{completions}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{notifications}</p>
              </div>
              <Activity className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                  >
                    <option value="all">All Actions</option>
                    <option value="reminder">Reminders</option>
                    <option value="escalation">Escalations</option>
                    <option value="completion">Completions</option>
                    <option value="notification">Notifications</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading activity log...
                    </td>
                  </tr>
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No activities found
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity: any) => {
                    const activityType = getActivityType(activity.content || '')
                    const typeColors = {
                      reminder: 'bg-blue-100 text-blue-800',
                      escalation: 'bg-red-100 text-red-800',
                      completion: 'bg-green-100 text-green-800',
                      notification: 'bg-purple-100 text-purple-800',
                      other: 'bg-gray-100 text-gray-800'
                    }

                    return (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(activity.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[activityType as keyof typeof typeColors]}`}>
                            {activityType.charAt(0).toUpperCase() + activityType.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div className="line-clamp-2">{activity.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {activity.sender_name || 'Task Manager Agent'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination info */}
          {filteredActivities.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {filteredActivities.length} of {activities.length} activities
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

