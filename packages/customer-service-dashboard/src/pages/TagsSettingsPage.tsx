import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Save, Info } from 'lucide-react';

interface TagSettings {
  ai_auto_tagging_enabled: boolean;
  tag_suggestions_enabled: boolean;
  tag_display_position: 'inline' | 'below';
}

export default function TagsSettingsPage() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<TagSettings>({
    queryKey: ['tag-settings'],
    queryFn: async () => {
      // For now, return default settings
      // TODO: Implement backend API to fetch/save settings
      return {
        ai_auto_tagging_enabled: true,
        tag_suggestions_enabled: true,
        tag_display_position: 'below',
      };
    },
  });

  const [localSettings, setLocalSettings] = useState<TagSettings>({
    ai_auto_tagging_enabled: true,
    tag_suggestions_enabled: true,
    tag_display_position: 'below',
  });

  // Update local settings when data is fetched
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement backend API call
      // await api.updateTagSettings(localSettings);
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      queryClient.invalidateQueries({ queryKey: ['tag-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving tag settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hash className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Tags Settings</h1>
              <p className="text-sm text-gray-500">Configure tagging behavior and display options</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        {saveSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            ✓ Settings saved successfully
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* AI Auto-Tagging */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  McCarthy AI Auto-Tagging
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enable McCarthy AI to automatically tag tickets, Live Chat conversations, and Group Chat messages based on content analysis, sentiment, intent, and customer behavior (RFM).
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>McCarthy AI analyzes content in real-time and suggests relevant tags. You can always manually add or remove tags.</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={localSettings.ai_auto_tagging_enabled}
                  onChange={(e) => setLocalSettings({ ...localSettings, ai_auto_tagging_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Tag Suggestions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tag Suggestions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Show tag suggestions while typing in Group Chat, Live Chat, and ticket notes. Suggestions are based on previously used tags and McCarthy AI recommendations.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={localSettings.tag_suggestions_enabled}
                  onChange={(e) => setLocalSettings({ ...localSettings, tag_suggestions_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Tag Display Position */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tag Display Position
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose how tags are displayed in messages and posts.
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tag_display_position"
                    value="below"
                    checked={localSettings.tag_display_position === 'below'}
                    onChange={() => setLocalSettings({ ...localSettings, tag_display_position: 'below' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Below Message</div>
                    <div className="text-sm text-gray-500">Tags appear as blue pills below the message content (recommended)</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tag_display_position"
                    value="inline"
                    checked={localSettings.tag_display_position === 'inline'}
                    onChange={() => setLocalSettings({ ...localSettings, tag_display_position: 'inline' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Inline with Message</div>
                    <div className="text-sm text-gray-500">Tags appear within the message text as #keywords</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Future Settings Preview */}
          <div className="bg-gray-100 rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Coming Soon
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Advanced tagging features currently in development:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>AI Confidence Threshold:</strong> Set minimum confidence level for auto-tagging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Tag Categories:</strong> Organize tags into predefined categories (Customer Type, Product, Issue Type, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>RFM Integration:</strong> Auto-tag VIP customers based on Recency, Frequency, Monetary analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Shopify Integration:</strong> Map product categories to tags and auto-tag based on purchase history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Tag Cleanup:</strong> Auto-merge similar tags and archive unused ones</span>
              </li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}

