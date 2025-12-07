import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Mail, Cloud, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  settings: IntegrationSetting[];
}

interface IntegrationSetting {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  value: string;
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Fetch integration status
  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await api.get('/api/integrations');
      return response.data;
    },
  });

  // Test integration connection
  const testConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await api.post(`/api/integrations/${integrationId}/test`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Save integration settings
  const saveSettingsMutation = useMutation({
    mutationFn: async ({ integrationId, settings }: { integrationId: string; settings: Record<string, string> }) => {
      const response = await api.post(`/api/integrations/${integrationId}/settings`, settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setEditingIntegration(null);
      setFormData({});
    },
  });

  const integrations: Integration[] = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Connect your Shopify store to view customer orders and data',
      icon: <Store className="w-6 h-6" />,
      status: integrationsData?.shopify?.connected ? 'connected' : 'disconnected',
      settings: [
        {
          key: 'SHOPIFY_DOMAIN',
          label: 'Store Domain',
          type: 'url',
          value: integrationsData?.shopify?.domain || '',
          placeholder: 'your-store.myshopify.com',
          required: true,
          helpText: 'Your Shopify store domain (e.g., your-store.myshopify.com)',
        },
        {
          key: 'SHOPIFY_ACCESS_TOKEN',
          label: 'Admin API Access Token',
          type: 'password',
          value: integrationsData?.shopify?.accessToken || '',
          placeholder: 'shpat_xxxxxxxxxxxxx',
          required: true,
          helpText: 'Create a custom app in Shopify Admin → Settings → Apps and sales channels → Develop apps',
        },
      ],
    },
    {
      id: 'cloudflare-r2',
      name: 'Cloudflare R2',
      description: 'Object storage for file attachments',
      icon: <Cloud className="w-6 h-6" />,
      status: integrationsData?.r2?.connected ? 'connected' : 'disconnected',
      settings: [
        {
          key: 'R2_BUCKET_NAME',
          label: 'Bucket Name',
          type: 'text',
          value: integrationsData?.r2?.bucketName || 'dartmouth-attachments',
          placeholder: 'dartmouth-attachments',
          required: true,
          helpText: 'Your Cloudflare R2 bucket name',
        },
      ],
    },
    {
      id: 'email',
      name: 'Email (Gmail)',
      description: 'Send and receive emails via Gmail',
      icon: <Mail className="w-6 h-6" />,
      status: integrationsData?.email?.connected ? 'connected' : 'disconnected',
      settings: [
        {
          key: 'GMAIL_CLIENT_ID',
          label: 'Gmail Client ID',
          type: 'text',
          value: integrationsData?.email?.clientId || '',
          placeholder: 'xxxxx.apps.googleusercontent.com',
          required: true,
        },
        {
          key: 'GMAIL_CLIENT_SECRET',
          label: 'Gmail Client Secret',
          type: 'password',
          value: integrationsData?.email?.clientSecret || '',
          placeholder: 'GOCSPX-xxxxx',
          required: true,
        },
        {
          key: 'GMAIL_REFRESH_TOKEN',
          label: 'Gmail Refresh Token',
          type: 'password',
          value: integrationsData?.email?.refreshToken || '',
          placeholder: '1//xxxxx',
          required: true,
        },
      ],
    },
    {
      id: 'resend',
      name: 'Resend',
      description: 'Email service for transactional emails',
      icon: <Mail className="w-6 h-6" />,
      status: integrationsData?.resend?.connected ? 'connected' : 'disconnected',
      settings: [
        {
          key: 'RESEND_API_KEY',
          label: 'Resend API Key',
          type: 'password',
          value: integrationsData?.resend?.apiKey || '',
          placeholder: 're_xxxxx',
          required: true,
          helpText: 'Get your API key from resend.com',
        },
      ],
    },
  ];

  const handleEdit = (integrationId: string, integration: Integration) => {
    setEditingIntegration(integrationId);
    const initialData: Record<string, string> = {};
    integration.settings.forEach(setting => {
      initialData[setting.key] = setting.value;
    });
    setFormData(initialData);
  };

  const handleSave = (integrationId: string) => {
    saveSettingsMutation.mutate({ integrationId, settings: formData });
  };

  const handleTest = (integrationId: string) => {
    testConnectionMutation.mutate(integrationId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Not Connected';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-1">Connect and manage your third-party integrations</p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    {integration.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{integration.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusIcon(integration.status)}
                      <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                        {getStatusText(integration.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingIntegration === integration.id ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingIntegration(null);
                          setFormData({});
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(integration.id)}
                        disabled={saveSettingsMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saveSettingsMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTest(integration.id)}
                        disabled={testConnectionMutation.isPending || integration.status === 'disconnected'}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        onClick={() => handleEdit(integration.id, integration)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Configure
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Form */}
            {editingIntegration === integration.id && (
              <div className="p-6 bg-gray-50">
                <div className="space-y-4">
                  {integration.settings.map((setting) => (
                    <div key={setting.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {setting.label}
                        {setting.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={setting.type}
                        value={formData[setting.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                        placeholder={setting.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {setting.helpText && (
                        <p className="text-xs text-gray-500 mt-1">{setting.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Need Help?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Shopify:</strong> Create a custom app in your Shopify Admin to get API credentials</li>
          <li>• <strong>Cloudflare R2:</strong> Configured via wrangler.toml and Cloudflare dashboard</li>
          <li>• <strong>Gmail:</strong> Set up OAuth 2.0 credentials in Google Cloud Console</li>
          <li>• <strong>Resend:</strong> Sign up at resend.com and create an API key</li>
        </ul>
      </div>
    </div>
  );
}

