import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Brain, Zap, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface McCarthySettings {
  agent_id: string;
  name: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
}

const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)', description: 'Most capable, best for complex tasks' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster and more affordable' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Previous generation, still powerful' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and economical' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Powerful reasoning' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: 'Balanced performance' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fast and compact' },
  ],
};

export default function McCarthySettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<McCarthySettings>({
    agent_id: 'ai-agent-001',
    name: 'McCarthy AI',
    llm_provider: 'openai',
    llm_model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['mccarthy-settings'],
    queryFn: async () => {
      const response = await api.get('/api/settings/mccarthy');
      return response.data as McCarthySettings;
    },
  });

  // Update state when data loads
  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<McCarthySettings>) => {
      return await api.put('/api/settings/mccarthy', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mccarthy-settings'] });
      setSuccessMessage('Settings saved successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.error || 'Failed to save settings');
      setSuccessMessage('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      llm_provider: settings.llm_provider,
      llm_model: settings.llm_model,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading settings...</div>
        </div>
      </div>
    );
  }

  const currentModels = LLM_MODELS[settings.llm_provider as keyof typeof LLM_MODELS] || LLM_MODELS.openai;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">McCarthy AI Settings</h1>
          </div>
          <p className="text-gray-600">Configure the AI model and behavior for McCarthy</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* LLM Provider */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">LLM Provider</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="llm_provider"
                  value="openai"
                  checked={settings.llm_provider === 'openai'}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      llm_provider: e.target.value,
                      llm_model: 'gpt-4o', // Reset to default model
                    });
                  }}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">OpenAI (ChatGPT)</div>
                  <div className="text-sm text-gray-500">GPT-4o, GPT-4 Turbo, GPT-3.5</div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="llm_provider"
                  value="anthropic"
                  checked={settings.llm_provider === 'anthropic'}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      llm_provider: e.target.value,
                      llm_model: 'claude-3-5-sonnet-20241022', // Reset to default model
                    });
                  }}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Anthropic (Claude)</div>
                  <div className="text-sm text-gray-500">Claude 3.5 Sonnet, Claude 3 Opus</div>
                </div>
              </label>
            </div>
          </div>

          {/* LLM Model */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">LLM Model</h2>
            </div>
            <div className="space-y-3">
              {currentModels.map((model) => (
                <label
                  key={model.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    settings.llm_model === model.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="llm_model"
                    value={model.value}
                    checked={settings.llm_model === model.value}
                    onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                    className="w-4 h-4 text-indigo-600 mt-1"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{model.label}</div>
                    <div className="text-sm text-gray-500">{model.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced Settings</h2>
            <div className="space-y-4">
              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise (0)</span>
                  <span>Balanced (1)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="16000"
                  step="100"
                  value={settings.max_tokens}
                  onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum length of AI responses (100-16000)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

