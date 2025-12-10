import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Clipboard, AlertCircle, Clock, CheckCircle, TrendingUp, Users, BarChart3, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
export default function TaskManagerDashboardPage() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  // Fetch all tasks for analytics
  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['task-manager-analytics', timeRange],
    queryFn: async () => {
      console.log('[TaskDashboard] Fetching tasks with channel=task, status=all')
      const response = await api.get('/api/tickets', {
        params: { 
          channel: 'task',
          limit: 1000,
          status: 'all'
        }
      })
      const tickets = response.data.tickets || []
      console.log('[TaskDashboard] Received tasks:', tickets.length, tickets)
      // EXTRA SAFETY: Filter to only show tickets with TSK- prefix
      const taskTickets = tickets.filter((t: any) => t.ticket_number?.startsWith('TSK-'))
      console.log('[TaskDashboard] After TSK- filter:', taskTickets.length)
      return taskTickets
    },
    refetchInterval: 30000,
  })

  const tasks = tasksData || []
  const now = new Date()

  console.log('[TaskDashboard] Render - tasks:', tasks.length, 'isLoading:', isLoading, 'error:', error)

  // Calculate analytics
  const activeTask = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled')
  const overdueTask = activeTask.filter((t: any) => t.sla_due_at && new Date(t.sla_due_at) < now)
  const dueTodayTasks = activeTask.filter((t: any) => {
    if (!t.sla_due_at) return false
    const deadline = new Date(t.sla_due_at)
    return deadline.toDateString() === now.toDateString()
  })
  const dueThisWeekTasks = activeTask.filter((t: any) => {
    if (!t.sla_due_at) return false
    const deadline = new Date(t.sla_due_at)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return deadline > now && deadline <= weekFromNow
  })

  // Completed this week
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const completedThisWeek = tasks.filter((t: any) => 
    t.status === 'completed' && 
    t.updated_at && 
    new Date(t.updated_at) >= weekAgo
  )

  // Tasks by priority
  const criticalTasks = activeTask.filter((t: any) => t.priority === 'critical')
  const highTasks = activeTask.filter((t: any) => t.priority === 'high')
  const normalTasks = activeTask.filter((t: any) => t.priority === 'normal')
  const lowTasks = activeTask.filter((t: any) => t.priority === 'low')

  // Tasks by status
  const openTasks = tasks.filter((t: any) => t.status === 'open')
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress')
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending')
  const completedTasks = tasks.filter((t: any) => t.status === 'completed')

  // Tasks by assignee
  const tasksByAssignee: Record<string, number> = {}
  activeTask.forEach((t: any) => {
    if (t.assigned_to) {
      tasksByAssignee[t.assigned_to] = (tasksByAssignee[t.assigned_to] || 0) + 1
    }
  })

  // Average completion time (calculate from completed tasks)
  const avgCompletionTime = completedThisWeek.length > 0 
    ? `${Math.round(completedThisWeek.length / 7 * 10) / 10} per day` 
    : 'N/A'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clipboard className="w-6 h-6 text-amber-600" />
              Task Manager Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">Overview and analytics</p>
          </div>
          <Link
            to="/task-manager/agent-status"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Agent Status & Activity
          </Link>
        </div>

        {/* Time Range Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'today'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
        </div>

        {/* Key Metrics - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link to="/task-digest?assignee=all" className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{activeTask.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total open tasks</p>
              </div>
              <Clipboard className="w-12 h-12 text-amber-500 opacity-20" />
            </div>
          </Link>

          <Link to="/task-digest?deadline=overdue" className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueTask.length}</p>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </Link>

          <Link to="/task-digest?deadline=today" className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Due Today</p>
                <p className="text-3xl font-bold text-orange-600">{dueTodayTasks.length}</p>
                <p className="text-xs text-gray-500 mt-1">Deadline today</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </Link>

          <Link to="/task-digest?status=completed" className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedThisWeek.length}</p>
                <p className="text-xs text-gray-500 mt-1">This week</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </Link>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link to="/task-digest?deadline=week" className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Due This Week</p>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{dueThisWeekTasks.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tasks with upcoming deadlines</p>
          </Link>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Completion Rate</p>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgCompletionTime}</p>
            <p className="text-xs text-gray-500 mt-1">Average completion rate</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Active Staff</p>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{Object.keys(tasksByAssignee).length}</p>
            <p className="text-xs text-gray-500 mt-1">Staff with assigned tasks</p>
          </div>
        </div>

        {/* Priority & Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Priority Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tasks by Priority</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Critical</span>
                    <span className="text-sm font-bold text-red-600">{criticalTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full transition-all" 
                      style={{ width: `${activeTask.length > 0 ? (criticalTasks.length / activeTask.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">High</span>
                    <span className="text-sm font-bold text-orange-600">{highTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all" 
                      style={{ width: `${activeTask.length > 0 ? (highTasks.length / activeTask.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Normal</span>
                    <span className="text-sm font-bold text-blue-600">{normalTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${activeTask.length > 0 ? (normalTasks.length / activeTask.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Low</span>
                    <span className="text-sm font-bold text-gray-600">{lowTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full transition-all" 
                      style={{ width: `${activeTask.length > 0 ? (lowTasks.length / activeTask.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tasks by Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Open</span>
                    <span className="text-sm font-bold text-yellow-600">{openTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all" 
                      style={{ width: `${tasks.length > 0 ? (openTasks.length / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">In Progress</span>
                    <span className="text-sm font-bold text-blue-600">{inProgressTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${tasks.length > 0 ? (inProgressTasks.length / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                    <span className="text-sm font-bold text-purple-600">{pendingTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all" 
                      style={{ width: `${tasks.length > 0 ? (pendingTasks.length / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                    <span className="text-sm font-bold text-green-600">{completedTasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all" 
                      style={{ width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/task-digest"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">View Daily Digest</h3>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-sm text-gray-600">See all tasks in table format with filters</p>
            </Link>

            <Link
              to="/task-manager/agent-status"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Agent Status & Activity</h3>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-sm text-gray-600">View agent status and activity log</p>
            </Link>

            <Link
              to="/settings/task-manager"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Task Manager Settings</h3>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-sm text-gray-600">Configure reminders, escalation, and automation</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
