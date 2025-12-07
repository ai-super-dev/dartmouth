import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Globe, Building, Calendar, Clock, DollarSign, Languages, Ruler, Save, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';

interface TenantSettings {
  tenant_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_website: string;
  timezone: string;
  language: string;
  measurement_system: string;
  currency: string;
  currency_symbol: string;
  date_format: string;
  time_format: string;
}

interface SettingsOptions {
  timezones: { value: string; label: string }[];
  languages: { value: string; label: string; spelling: string }[];
  measurementSystems: { value: string; label: string }[];
  currencies: { value: string; symbol: string; label: string }[];
  dateFormats: { value: string; label: string; example: string }[];
  timeFormats: { value: string; label: string }[];
}

const defaultSettings: TenantSettings = {
  tenant_id: 'default',
  business_name: '',
  business_email: '',
  business_phone: '',
  business_address: '',
  business_website: '',
  timezone: 'Australia/Brisbane',
  language: 'en-AU',
  measurement_system: 'metric',
  currency: 'AUD',
  currency_symbol: '$',
  date_format: 'DD/MM/YYYY',
  time_format: '12h'
};

export default function DartmouthOSSettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TenantSettings>(defaultSettings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/settings');
      return response.data as TenantSettings;
    }
  });

  // Fetch dropdown options
  const { data: options } = useQuery({
    queryKey: ['tenant-settings-options'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/settings/options');
      return response.data as SettingsOptions;
    }
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TenantSettings) => {
      const response = await api.put('/api/tenant/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      alert('Settings saved successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to save settings: ${error.message}`);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    // Reset to factory defaults
    const factoryDefaults: TenantSettings = {
      tenant_id: 'default',
      business_name: '',
      business_email: '',
      business_phone: '',
      business_address: '',
      business_website: '',
      timezone: 'Australia/Brisbane',
      language: 'en-AU',
      measurement_system: 'metric',
      currency: 'AUD',
      currency_symbol: '$',
      date_format: 'DD/MM/YYYY',
      time_format: '12h'
    };
    setFormData(factoryDefaults);
    setShowResetConfirm(false);
  };

  // Update currency symbol when currency changes
  const handleCurrencyChange = (currency: string) => {
    const currencyOption = options?.currencies.find(c => c.value === currency);
    setFormData({
      ...formData,
      currency,
      currency_symbol: currencyOption?.symbol || '$'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dartmouth OS Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure global settings for your Dartmouth OS instance. These settings apply to all agents unless overridden.
        </p>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Amazing Transfers"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Email
            </label>
            <input
              type="email"
              value={formData.business_email}
              onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="support@amazingtransfers.com.au"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Phone
            </label>
            <input
              type="tel"
              value={formData.business_phone}
              onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="+61 7 1234 5678"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.business_website}
              onChange={(e) => setFormData({ ...formData, business_website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://amazingtransfers.com.au"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Address
            </label>
            <input
              type="text"
              value={formData.business_address}
              onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="123 Transfer Lane, Brisbane QLD 4000"
            />
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Languages className="w-4 h-4 inline mr-1" />
              Language / Spelling
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.languages.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options?.languages.find(l => l.value === formData.language)?.spelling}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Ruler className="w-4 h-4 inline mr-1" />
              Measurement System
            </label>
            <select
              value={formData.measurement_system}
              onChange={(e) => setFormData({ ...formData, measurement_system: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.measurementSystems.map(ms => (
                <option key={ms.value} value={ms.value}>{ms.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.currencies.map(curr => (
                <option key={curr.value} value={curr.value}>{curr.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date & Time Formats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Date & Time Formats</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select
              value={formData.date_format}
              onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.dateFormats.map(df => (
                <option key={df.value} value={df.value}>{df.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <select
              value={formData.time_format}
              onChange={(e) => setFormData({ ...formData, time_format: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options?.timeFormats.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-indigo-900 mb-3">Preview - How AI Will Format Responses</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-indigo-600 font-medium">Date:</span>
            <p className="text-indigo-900">
              {options?.dateFormats.find(d => d.value === formData.date_format)?.example || '31/12/2025'}
            </p>
          </div>
          <div>
            <span className="text-indigo-600 font-medium">Time:</span>
            <p className="text-indigo-900">
              {formData.time_format === '12h' ? '2:30 PM' : '14:30'}
            </p>
          </div>
          <div>
            <span className="text-indigo-600 font-medium">Currency:</span>
            <p className="text-indigo-900">{formData.currency_symbol}99.95 {formData.currency}</p>
          </div>
          <div>
            <span className="text-indigo-600 font-medium">Measurement:</span>
            <p className="text-indigo-900">
              {formData.measurement_system === 'metric' ? '50 cm, 2.5 kg' : '20 in, 5.5 lb'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset to Factory Defaults?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will reset all settings to their factory defaults:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside">
              <li>Timezone: Australia/Brisbane</li>
              <li>Language: Australian English</li>
              <li>Measurement: Metric</li>
              <li>Currency: AUD ($)</li>
              <li>Date Format: DD/MM/YYYY</li>
              <li>Time Format: 12-hour</li>
              <li>Business information will be cleared</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
