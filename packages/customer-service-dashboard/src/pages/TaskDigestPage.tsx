import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clipboard, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Task {
  ticket_id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  assigned_to: string
  sla_due_at: string | null
  created_at: string
}

export default function TaskDigestPage() {
  const { user } = useAuthStore()

  const { data: myTasks, isLoading: loadingMyTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const response = await api.get('/api/tickets', {
        params: { channel: 'task', assignedTo: user?.id, limit: 100 }
      })
      return response.data.tickets as Task[]
    },
    refetchInterval: 30000,
  })

  const { data: allTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const response = await api.get('/api/tickets', {
        params: { channel: 'task', limit: 1000 }
      })
      return response.data.tickets as Task[]
    },
    refetchInterval: 30000,
  })

  const now = new Date()

  // Filter tasks
  const myOpenTasks = myTasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled') || []
  const myOverdueTasks = myOpenTasks.filter(t => t.sla_due_at && new Date(t.sla_due_at) < now)
  const myApproachingTasks = myOpenTasks.filter(t => {
    if (!t.sla_due_at) return false
    const deadline = new Date(t.sla_due_at)
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return deadline > now && deadline <= in24Hours
  })

  const allOverdueTasks = allTasks?.filter(t => 
    t.status !== 'completed' && 
    t.status !== 'cancelled' && 
    t.sla_due_at && 
    new Date(t.sla_due_at) < now
  ) || []

  const formatTicketNumber = (ticketNumber: string): string => {
    // Handle sub-tasks (TSK-100-1)
    const subTaskMatch = ticketNumber.match(/^([A-Z]+)-?(\d+)-(\d+)$/)
    if (subTaskMatch) {
      const prefix = subTaskMatch[1]
      const parentNum = parseInt(subTaskMatch[2], 10)
      const subNum = parseInt(subTaskMatch[3], 10)
      return `${prefix}-${parentNum}-${subNum}`
    }
    
    // Handle regular tickets (TKT-123, TSK-100)
    const prefixMatch = ticketNumber.match(/^([A-Z]+)-?/)
    const numMatch = ticketNumber.match(/\d+/)
    if (!numMatch) return ticketNumber
    const prefix = prefixMatch ? prefixMatch[1] : 'TSK'
    const num = parseInt(numMatch[0], 10)
    return `${prefix}-${num}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 ring-red-600/20'
      case 'high': return 'bg-orange-100 text-orange-800 ring-orange-600/20'
      case 'normal': return 'bg-blue-100 text-blue-800 ring-blue-600/20'
      case 'low': return 'bg-gray-100 text-gray-800 ring-gray-600/20'
      default: return 'bg-gray-100 text-gray-800 ring-gray-600/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'open': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clipboard className="w-6 h-6 text-amber-600" />
            Task Digest
          </h1>
          <p className="text-sm text-gray-600 mt-1">Your daily task overview and deadlines</p>
        </div>

        {/* My Tasks Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Open Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{myOpenTasks.length}</p>
              </div>
              <Clipboard className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Overdue</p>
                <p className="text-2xl font-bold text-red-600">{myOverdueTasks.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Due in 24h</p>
                <p className="text-2xl font-bold text-orange-600">{myApproachingTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* My Overdue Tasks */}
        {myOverdueTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                My Overdue Tasks ({myOverdueTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {myOverdueTasks.map((task) => (
                <Link
                  key={task.ticket_id}
                  to={`/tickets?search=${task.ticket_number}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-amber-600">{formatTicketNumber(task.ticket_number)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{task.subject}</p>
                      {task.sla_due_at && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Overdue by {formatDistanceToNow(new Date(task.sla_due_at))}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Approaching Deadlines */}
        {myApproachingTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-orange-600 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Due in Next 24 Hours ({myApproachingTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {myApproachingTasks.map((task) => (
                <Link
                  key={task.ticket_id}
                  to={`/tickets?search=${task.ticket_number}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-amber-600">{formatTicketNumber(task.ticket_number)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{task.subject}</p>
                      {task.sla_due_at && (
                        <p className="text-xs text-orange-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {formatDistanceToNow(new Date(task.sla_due_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All My Open Tasks */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-amber-600" />
              All My Open Tasks ({myOpenTasks.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loadingMyTasks ? (
              <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
            ) : myOpenTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p>No open tasks! Great job!</p>
              </div>
            ) : (
              myOpenTasks.map((task) => (
                <Link
                  key={task.ticket_id}
                  to={`/tickets?search=${task.ticket_number}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-amber-600">{formatTicketNumber(task.ticket_number)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{task.subject}</p>
                      {task.sla_due_at && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {formatDistanceToNow(new Date(task.sla_due_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Team Overdue Tasks */}
        {allOverdueTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Team Overdue Tasks ({allOverdueTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {allOverdueTasks.slice(0, 10).map((task) => (
                <Link
                  key={task.ticket_id}
                  to={`/tickets?search=${task.ticket_number}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-amber-600">{formatTicketNumber(task.ticket_number)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{task.subject}</p>
                      {task.sla_due_at && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Overdue by {formatDistanceToNow(new Date(task.sla_due_at))}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

