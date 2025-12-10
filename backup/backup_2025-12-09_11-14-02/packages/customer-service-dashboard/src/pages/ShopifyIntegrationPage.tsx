import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

export default function ShopifyIntegrationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');
  const [isEditing, setIsEditing] = useState(false);
  const [domain, setDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Shopify integration status
  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await api.get('/api/integrations');
      return response.data;
    },
  });

  // Fetch debug info
  const { data: debugData, refetch: refetchDebug } = useQuery({
    queryKey: ['integrations-debug'],
    queryFn: async () => {
      const response = await api.get('/api/integrations/debug');
      return response.data;
    },
    enabled: false, // Only fetch when manually triggered
  });

  // Save Shopify settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: { domain: string; accessToken: string }) => {
      const response = await api.post('/api/integrations/shopify/settings', settings);
      return response.data;
    },
    onSuccess: () => {
      setSaveResult({ success: true, message: 'Settings saved successfully!' });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      // Clear the form
      setDomain('');
      setAccessToken('');
    },
    onError: (error: any) => {
      setSaveResult({
        success: false,
        message: error.response?.data?.message || 'Failed to save settings',
      });
    },
  });

  // Test Shopify connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/integrations/shopify/test');
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed',
      });
    },
  });

  const shopifyData = integrationsData?.shopify;
  const isConnected = shopifyData?.connected;

  const handleEdit = () => {
    setIsEditing(true);
    setSaveResult(null);
    setTestResult(null);
    // Pre-fill with current values (unmasked domain, empty token)
    setDomain(shopifyData?.domain?.replace(/•/g, '') || '');
    setAccessToken('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDomain('');
    setAccessToken('');
    setSaveResult(null);
  };

  const handleSave = () => {
    if (!domain || !accessToken) {
      setSaveResult({ success: false, message: 'Both fields are required' });
      return;
    }
    saveSettingsMutation.mutate({ domain, accessToken });
  };

  const handleTest = () => {
    setTestResult(null);
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shopify Integration</h1>
        <p className="text-gray-600 mt-1">Connect your Shopify store to view customer orders and data in tickets</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Installation Guide
          </button>
        </nav>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-lg text-green-600">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Shopify Store</h2>
                <p className="text-sm text-gray-600 mt-1">
                  View customer order history, tracking info, and purchase data
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {isConnected ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Not Connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveSettingsMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => refetchDebug()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Debug Info
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testConnectionMutation.isPending || !isConnected}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Configure
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 border-b ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                </p>
                <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Result */}
        {saveResult && (
          <div className={`p-4 border-b ${saveResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {saveResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${saveResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {saveResult.success ? 'Saved Successfully!' : 'Save Failed'}
                </p>
                <p className={`text-sm mt-1 ${saveResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {saveResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugData && (
          <div className="p-4 border-b bg-gray-50 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Debug Information</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-gray-700 mb-1">KV Storage:</p>
                <p className="text-gray-600">Domain: {debugData.kv?.SHOPIFY_DOMAIN || 'not set'}</p>
                <p className="text-gray-600">Token: {debugData.kv?.SHOPIFY_ACCESS_TOKEN || 'not set'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Secrets:</p>
                <p className="text-gray-600">Domain: {debugData.secrets?.SHOPIFY_DOMAIN || 'not set'}</p>
                <p className="text-gray-600">Token: {debugData.secrets?.SHOPIFY_ACCESS_TOKEN || 'not set'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Settings */}
        {!isEditing && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Store Domain</label>
                <div className="text-sm text-gray-900">{shopifyData?.domain || 'Not configured'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Access Token</label>
                <div className="text-sm text-gray-900">{shopifyData?.accessToken || 'Not configured'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        {isEditing && (
          <div className="p-6 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Shopify Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Shopify store domain (e.g., your-store.myshopify.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin API Access Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="shpat_xxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Shopify Admin API access token (starts with shpat_)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">How to get your Shopify credentials:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to Shopify Admin → Settings → Apps and sales channels</li>
                  <li>Click "Develop apps" → "Create an app" (name it "Dartmouth OS")</li>
                  <li>Configure Admin API scopes: <code className="bg-blue-100 px-1 rounded">read_customers</code>, <code className="bg-blue-100 px-1 rounded">read_orders</code>, <code className="bg-blue-100 px-1 rounded">read_products</code></li>
                  <li>Click "Install app" and copy the Admin API access token</li>
                </ol>
                <div className="mt-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <a
                    href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Shopify Custom Apps Documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Features Section */}
      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">What You'll Get</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Customer Order History</p>
              <p className="text-xs text-gray-600 mt-1">View all orders from a customer when viewing their ticket</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Order Tracking</p>
              <p className="text-xs text-gray-600 mt-1">See tracking numbers and fulfillment status</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Product Information</p>
              <p className="text-xs text-gray-600 mt-1">View product details and variants from orders</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">AI Agent Context</p>
              <p className="text-xs text-gray-600 mt-1">AI can reference customer's order history when responding</p>
            </div>
          </li>
        </ul>
      </div>
      </div>
      )}

      {/* Installation Guide Tab */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shopify Installation Guide</h2>
            <p className="text-gray-700 mb-4">
              Follow these steps to connect your Shopify store to Dartmouth OS. This will allow you to view customer order history, 
              tracking information, and product details directly in your support tickets.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Time required:</strong> 5-10 minutes<br />
                <strong>Shopify plan:</strong> Any plan (Basic, Shopify, Advanced, Plus)<br />
                <strong>Access needed:</strong> Store owner or staff with "Develop apps" permission
              </p>
            </div>
          </div>

          {/* Step 1 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Shopify Admin</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Log in to your Shopify Admin panel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Click <strong>Settings</strong> (bottom left corner)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Click <strong>Apps and sales channels</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Click <strong>Develop apps</strong> (top right)</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> If you don't see "Develop apps", you may need to enable it first. Click "Allow custom app development" and confirm.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Custom App</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Click <strong>Create an app</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Enter app name: <code className="bg-gray-100 px-2 py-1 rounded">Dartmouth OS</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Select an app developer (usually yourself)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Click <strong>Create app</strong></span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure API Scopes</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Click <strong>Configure Admin API scopes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Search for and enable these scopes:</span>
                  </li>
                </ol>
                <div className="mt-3 ml-6 space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <code className="font-mono text-sm">read_customers</code>
                    <span className="text-xs text-gray-600">- View customer information</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <code className="font-mono text-sm">read_orders</code>
                    <span className="text-xs text-gray-600">- View order history</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <code className="font-mono text-sm">read_products</code>
                    <span className="text-xs text-gray-600">- View product details</span>
                  </div>
                </div>
                <ol start={3} className="space-y-3 text-gray-700 mt-3">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Click <strong>Save</strong></span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Important:</strong> Only enable these three scopes. Do not enable write permissions unless absolutely necessary.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Install the App</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Click <strong>Install app</strong> (top right)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Review the permissions and click <strong>Install</strong></span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> You must install the app before you can get the access token. If you skip this step, you'll get a 403 Forbidden error.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Get API Credentials</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Click <strong>API credentials</strong> tab</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Copy your <strong>Admin API access token</strong> (starts with <code className="bg-gray-100 px-1 rounded">shpat_</code>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Note your store domain (e.g., <code className="bg-gray-100 px-1 rounded">your-store.myshopify.com</code>)</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Security Warning:</strong> The access token is shown only once! Copy it immediately and store it securely. 
                    If you lose it, you'll need to uninstall and reinstall the app to get a new token.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Dartmouth OS</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Go to the <strong>Configuration</strong> tab above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Click <strong>Configure</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Enter your Store Domain and Admin API Access Token</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Click <strong>Save</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">5.</span>
                    <span>Click <strong>Test Connection</strong> to verify everything works</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Success!</strong> If the test passes, you're all set. Customer order data will now appear in your support tickets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Troubleshooting Common Issues</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">403 Forbidden Error</h4>
                <p className="text-sm text-gray-700 mb-2">This usually means:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• The app wasn't installed (Step 4)</li>
                  <li>• Wrong API scopes were configured</li>
                  <li>• You copied the API Key instead of the Access Token</li>
                </ul>
                <p className="text-sm text-gray-700 mt-2"><strong>Solution:</strong> Go back to Step 3 and verify the scopes, then reinstall the app.</p>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">401 Unauthorized Error</h4>
                <p className="text-sm text-gray-700 mb-2">This means the access token is invalid.</p>
                <p className="text-sm text-gray-700"><strong>Solution:</strong> Double-check you copied the entire token (starts with shpat_). If still failing, uninstall and reinstall the app to get a new token.</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Connection Timeout</h4>
                <p className="text-sm text-gray-700 mb-2">This means the domain is incorrect.</p>
                <p className="text-sm text-gray-700"><strong>Solution:</strong> Verify your store domain is in the format: your-store.myshopify.com (not your custom domain).</p>
              </div>
            </div>
          </div>

          {/* Help Links */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h3>
            <div className="space-y-2">
              <a
                href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Shopify Custom Apps Documentation
              </a>
              <a
                href="https://shopify.dev/docs/api/admin-rest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Shopify Admin API Reference
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

