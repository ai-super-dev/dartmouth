import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { Clipboard, Filter, User, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function TaskDigestTablePage() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()

  // Filters - Default to "My Tasks"
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>(searchParams.get('assignee') || 'me') // Default to My Tasks
  const [deadlineFilter, setDeadlineFilter] = useState<string>(searchParams.get('deadline') || 'all')
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all')
  const [flagsFilter, setFlagsFilter] = useState<string>(searchParams.get('flags') || 'all')

  // Update filters when URL params change
  useEffect(() => {
    if (searchParams.get('status')) setStatusFilter(searchParams.get('status')!)
    if (searchParams.get('priority')) setPriorityFilter(searchParams.get('priority')!)
    if (searchParams.get('assignee')) setAssigneeFilter(searchParams.get('assignee')!)
    if (searchParams.get('deadline')) setDeadlineFilter(searchParams.get('deadline')!)
    if (searchParams.get('type')) setTypeFilter(searchParams.get('type')!)
    if (searchParams.get('flags')) setFlagsFilter(searchParams.get('flags')!)
  }, [searchParams])

  // Fetch tasks (only channel='task')
  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['task-digest-table'],
    queryFn: async () => {
      console.log('[TaskDigest] Fetching tasks with channel=task, status=all')
      const response = await api.get('/api/tickets', {
        params: { 
          channel: 'task',  // ONLY tasks, no regular tickets
          limit: 1000,
          status: 'all' // Get all statuses
        }
      })
      const tickets = response.data.tickets || []
      console.log('[TaskDigest] Received tasks:', tickets.length, tickets)
      // EXTRA SAFETY: Filter to only show tickets with TSK- prefix
      const taskTickets = tickets.filter((t: any) => t.ticket_number?.startsWith('TSK-'))
      console.log('[TaskDigest] After TSK- filter:', taskTickets.length)
      return taskTickets
    },
    refetchInterval: 30000,
  })

  // Fetch staff list for assignee filter
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const response = await api.get('/api/staff')
      return response.data.staff
    },
  })

  const tasks = tasksData || []
  const staff = staffData || []
  const now = new Date()

  console.log('[TaskDigest] Render - tasks:', tasks.length, 'isLoading:', isLoading, 'error:', error)
  console.log('[TaskDigest] Active filters:', { statusFilter, priorityFilter, assigneeFilter, deadlineFilter, typeFilter, flagsFilter })
  console.log('[TaskDigest] Current time:', now.toISOString())
  
  // Debug: Log all task deadlines
  tasks.forEach((t: any) => {
    if (t.sla_due_at) {
      const deadline = new Date(t.sla_due_at)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      console.log(`[TaskDigest] Task ${t.ticket_number}: deadline=${deadline.toISOString()}, isToday=${deadline >= todayStart && deadline <= todayEnd}, isOverdue=${deadline < now}`)
    }
  })

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'me' && task.assigned_to !== user?.id) return false
        if (assigneeFilter !== 'me' && task.assigned_to !== assigneeFilter) return false
      }

      // Deadline filter
      if (deadlineFilter !== 'all') {
        if (!task.sla_due_at) return false
        const deadline = new Date(task.sla_due_at)
        
        // Get start and end of today for accurate comparison
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        
        if (deadlineFilter === 'overdue' && deadline >= now) return false
        if (deadlineFilter === 'today') {
          // Must be within today's date range (not before, not after)
          if (deadline < todayStart || deadline > todayEnd) return false
        }
        if (deadlineFilter === 'week') {
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (deadline < now || deadline > weekFromNow) return false
        }
        if (deadlineFilter === 'month') {
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          if (deadline < now || deadline > monthFromNow) return false
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'parent' && task.parent_task_id) return false
        if (typeFilter === 'subtask' && !task.parent_task_id) return false
      }

      // Flags filter
      if (flagsFilter !== 'all') {
        const taskIsOverdue = task.sla_due_at && new Date(task.sla_due_at) < now
        const taskIsEscalated = task.escalation_level > 0
        const taskIsMerged = !!task.merged_into
        const taskIsSnoozed = task.snoozed_until && new Date(task.snoozed_until) > now
        
        if (flagsFilter === 'overdue' && !taskIsOverdue) return false
        if (flagsFilter === 'escalated' && !taskIsEscalated) return false
        if (flagsFilter === 'merged' && !taskIsMerged) return false
        if (flagsFilter === 'snoozed' && !taskIsSnoozed) return false
      }

      return true
    })
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, deadlineFilter, typeFilter, flagsFilter, user, now])

  const formatTicketNumber = (ticketNumber: string): string => {
    const subTaskMatch = ticketNumber.match(/^([A-Z]+)-?(\d+)-(\d+)$/)
    if (subTaskMatch) {
      const prefix = subTaskMatch[1]
      const parentNum = parseInt(subTaskMatch[2], 10)
      const subNum = parseInt(subTaskMatch[3], 10)
      return `${prefix}-${parentNum}-${subNum}`
    }
    
    const prefixMatch = ticketNumber.match(/^([A-Z]+)-?/)
    const numMatch = ticketNumber.match(/\d+/)
    if (!numMatch) return ticketNumber
    const prefix = prefixMatch ? prefixMatch[1] : 'TSK'
    const num = parseInt(numMatch[0], 10)
    return `${prefix}-${num}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'open': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find((s: any) => s.id === staffId)
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unassigned'
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < now
  }

  // Show manager/admin view or staff view
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clipboard className="w-6 h-6 text-amber-600" />
            Daily Digest
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isManagerOrAdmin ? 'All team tasks' : 'Your assigned tasks'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="me">My Tasks</option>
                {staff.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>

            {/* Deadline Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="parent">Parent Tasks</option>
                <option value="subtask">Sub-Tasks Only</option>
              </select>
            </div>

            {/* Flags Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Flags</label>
              <select
                value={flagsFilter}
                onChange={(e) => setFlagsFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="escalated">Escalated</option>
                <option value="snoozed">Snoozed</option>
                <option value="merged">Merged</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent/Child</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flags</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">No tasks found</td>
                  </tr>
                ) : (
                  filteredTasks.map((task: any) => (
                    <tr key={task.ticket_id} className="hover:bg-gray-50">
                      {/* Task ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/tickets?search=${task.ticket_number}`}
                          className="text-sm font-medium text-amber-600 hover:text-amber-800"
                        >
                          {formatTicketNumber(task.ticket_number)}
                        </Link>
                      </td>
                      {/* Created Date/Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {new Date(task.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      {/* Parent/Child */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {task.parent_task_id ? (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Users className="w-4 h-4" />
                            <span>Child</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-600">
                            <User className="w-4 h-4" />
                            <span>Parent</span>
                          </span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      {/* Subject */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{task.subject}</div>
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getStaffName(task.assigned_to)}
                      </td>
                      {/* Flags */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1 items-center">
                          {isOverdue(task.sla_due_at) && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded" title="Overdue">
                              Overdue
                            </span>
                          )}
                          {task.escalation_level > 0 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded" title={`Escalated (Level ${task.escalation_level})`}>
                              Escalated
                            </span>
                          )}
                          {task.merged_into && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded" title="Merged">
                              Merged
                            </span>
                          )}
                          {task.snoozed_until && new Date(task.snoozed_until) > now && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded" title="Snoozed">
                              Snoozed
                            </span>
                          )}
                          {!isOverdue(task.sla_due_at) && !task.escalation_level && !task.merged_into && (!task.snoozed_until || new Date(task.snoozed_until) <= now) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      {/* Deadline */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {task.sla_due_at ? (
                          <div className={`text-xs ${isOverdue(task.sla_due_at) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {new Date(task.sla_due_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                            {isOverdue(task.sla_due_at) && (
                              <div className="text-xs text-red-600">
                                {formatDistanceToNow(new Date(task.sla_due_at))} ago
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No deadline</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

