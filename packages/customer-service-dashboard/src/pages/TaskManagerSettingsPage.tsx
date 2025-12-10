import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const DEFAULT_SYSTEM_MESSAGE = `You are the Task Manager AI, an intelligent assistant helping staff coordinate tasks and projects.

Your Role:
- Help staff create, update, and manage tasks
- Provide insights on task status and team workload
- Suggest task assignments based on staff availability and expertise
- Track project progress and deadlines
- Coordinate team collaboration
- Answer questions about tasks and projects

Capabilities:
- Search and filter tasks by any criteria
- Create new tasks with all details
- Update task status, priority, assignments
- Assign tasks to team members
- Provide task summaries and reports
- Track overdue and upcoming tasks
- Suggest task prioritization

Communication Style:
- Professional but friendly
- Concise and action-oriented
- Proactive with suggestions
- Clear about what actions you can take
- Ask for confirmation on important changes

Always be helpful, efficient, and focused on helping the team stay organized and productive.`;

export default function TaskManagerSettingsPage() {
  const queryClient = useQueryClient();
  const [systemMessage, setSystemMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch current system message
  const { isLoading } = useQuery({
    queryKey: ['task-manager-system-message'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/settings');
      const message = response.data.settings?.task_manager_system_message || DEFAULT_SYSTEM_MESSAGE;
      setSystemMessage(message);
      return response.data;
    },
  });

  // Save system message mutation
  const saveMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.put('/api/tenant/settings', {
        task_manager_system_message: message,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-manager-system-message'] });
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleChange = (value: string) => {
    setSystemMessage(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(systemMessage);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to the default system message?')) {
      setSystemMessage(DEFAULT_SYSTEM_MESSAGE);
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Task Manager AI Settings
          </h1>
        </div>
        <p className="text-sm text-gray-600">
          Configure how the Task Manager AI assistant behaves and communicates with your team.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">
            Settings saved successfully!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About System Messages</p>
            <p>
              The system message defines the Task Manager AI's personality, capabilities, and behavior.
              It's the first instruction the AI receives in every conversation, setting the context for
              how it should respond to staff requests.
            </p>
          </div>
        </div>
      </div>

      {/* System Message Editor */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">System Message</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define how the Task Manager AI should behave and communicate
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={systemMessage}
            onChange={(e) => handleChange(e.target.value)}
            rows={20}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter system message..."
          />

          <div className="mt-4 text-xs text-gray-500">
            <p>
              <strong>Tips:</strong> Be specific about the AI's role, capabilities, and communication style.
              Include examples of how it should respond to common requests.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-orange-600 font-medium">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Best Practices</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Be Clear:</strong> Clearly define the AI's role and what it can and cannot do
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Set Boundaries:</strong> Specify which actions require confirmation
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Define Tone:</strong> Describe the communication style (professional, friendly, etc.)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Include Context:</strong> Mention team structure, workflows, and priorities
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Test Changes:</strong> After updating, test the AI's responses to ensure it behaves as expected
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

