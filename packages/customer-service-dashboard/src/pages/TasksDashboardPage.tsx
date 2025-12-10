import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Bot, Plus, Calendar, User, AlertCircle } from 'lucide-react';
import { tasksApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import TaskManagerChatPanel from '../components/TaskManagerChatPanel';
import CreateTaskModal from '../components/CreateTaskModal';

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

const priorityColors = {
  low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  normal: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  urgent: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function TasksDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter, assignmentFilter],
    queryFn: async () => {
      const params: any = {};
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }
      if (assignmentFilter === 'my-tasks') {
        params.assigned_to = user?.id;
      } else if (assignmentFilter === 'created-by-me') {
        params.created_by = user?.id;
      }

      const response = await tasksApi.list(params);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const tasks = tasksData?.tasks || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pb-4 -mx-6 px-6 -mt-6 pt-6 border-b border-gray-200 mb-4">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900 flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-blue-600" />
              Tasks Dashboard
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                {tasks.length}
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage and track all your tasks and team projects
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-2">
            <button
              type="button"
              onClick={() => setShowChatPanel(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Bot className="w-4 h-4" />
              Task Manager AI
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-lg border-2 text-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 bg-white border-gray-300"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="block w-full rounded-lg border-2 text-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 bg-white border-gray-300"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Assignment Filter */}
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="block w-full rounded-lg border-2 text-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 bg-white border-gray-300"
            >
              <option value="all">All Tasks</option>
              <option value="my-tasks">My Tasks</option>
              <option value="created-by-me">Created by Me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new task or ask Task Manager AI for help.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
            <button
              onClick={() => setShowChatPanel(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Bot className="w-4 h-4" />
              Ask AI
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{task.task_number}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      priorityColors[task.priority as keyof typeof priorityColors]
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {task.title}
                  </h3>
                </div>
              </div>

              {/* Task Description */}
              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                  {task.description}
                </p>
              )}

              {/* Task Meta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${
                    statusColors[task.status as keyof typeof statusColors]
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {task.assigned_to && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    <span>
                      {task.assignee_first_name} {task.assignee_last_name}
                    </span>
                  </div>
                )}

                {task.due_date && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}</span>
                  </div>
                )}

                {task.related_ticket_id && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Related to ticket</span>
                  </div>
                )}
              </div>

              {/* Task Footer */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Manager Chat Panel */}
      <TaskManagerChatPanel
        isOpen={showChatPanel}
        onClose={() => setShowChatPanel(false)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

