import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Globe, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface AgentOverrides {
  agent_id: string;
  timezone: string | null;
  language: string | null;
  measurement_system: string | null;
  currency: string | null;
  currency_symbol: string | null;
  date_format: string | null;
  time_format: string | null;
}

interface TenantSettings {
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

export default function AgentRegionalOverridesPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AgentOverrides>({
    agent_id: 'customer-service-agent',
    timezone: null,
    language: null,
    measurement_system: null,
    currency: null,
    currency_symbol: null,
    date_format: null,
    time_format: null
  });

  // Fetch tenant settings (defaults)
  const { data: tenantSettings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/settings');
      return response.data as TenantSettings;
    }
  });

  // Fetch agent overrides
  const { data: overrides, isLoading } = useQuery({
    queryKey: ['agent-overrides'],
    queryFn: async () => {
      const response = await api.get('/api/ai-agent/regional-overrides');
      return response.data as AgentOverrides;
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

  // Update form when overrides load
  useEffect(() => {
    if (overrides) {
      setFormData(overrides);
    }
  }, [overrides]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AgentOverrides) => {
      const response = await api.put('/api/ai-agent/regional-overrides', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-overrides'] });
      alert('Overrides saved successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to save overrides: ${error.message}`);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleClear = () => {
    setFormData({
      agent_id: 'customer-service-agent',
      timezone: null,
      language: null,
      measurement_system: null,
      currency: null,
      currency_symbol: null,
      date_format: null,
      time_format: null
    });
  };

  // Helper to get effective value (override or tenant default)
  const getEffective = (field: keyof AgentOverrides): string => {
    const override = formData[field];
    if (override !== null && override !== '') return override as string;
    return (tenantSettings as any)?.[field] || '';
  };

  // Helper to check if field is overridden
  const isOverridden = (field: keyof AgentOverrides): boolean => {
    return formData[field] !== null && formData[field] !== '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading overrides...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link to="/ai-agent/system-message" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to AI Agent Settings
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Globe className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Regional Overrides</h1>
        </div>
        <p className="text-gray-600">
          Override tenant-level regional settings for this specific agent. Leave fields empty to inherit from Dartmouth OS Settings.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Settings left as "Inherit from tenant" will use the values from 
          <Link to="/settings/dartmouth-os" className="text-blue-600 hover:underline mx-1">Dartmouth OS Settings</Link>.
          Only set overrides if this agent needs different regional settings (e.g., for a US market).
        </p>
      </div>

      {/* Override Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Regional Overrides</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
              {isOverridden('timezone') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.timezone || ''}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({tenantSettings?.timezone})</option>
              {options?.timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language / Spelling
              {isOverridden('language') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.language || ''}
              onChange={(e) => setFormData({ ...formData, language: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({options?.languages.find(l => l.value === tenantSettings?.language)?.label})</option>
              {options?.languages.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          
          {/* Measurement System */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Measurement System
              {isOverridden('measurement_system') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.measurement_system || ''}
              onChange={(e) => setFormData({ ...formData, measurement_system: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({tenantSettings?.measurement_system})</option>
              {options?.measurementSystems.map(ms => (
                <option key={ms.value} value={ms.value}>{ms.label}</option>
              ))}
            </select>
          </div>
          
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
              {isOverridden('currency') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.currency || ''}
              onChange={(e) => {
                const curr = options?.currencies.find(c => c.value === e.target.value);
                setFormData({ 
                  ...formData, 
                  currency: e.target.value || null,
                  currency_symbol: curr?.symbol || null
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({tenantSettings?.currency})</option>
              {options?.currencies.map(curr => (
                <option key={curr.value} value={curr.value}>{curr.label}</option>
              ))}
            </select>
          </div>
          
          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
              {isOverridden('date_format') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.date_format || ''}
              onChange={(e) => setFormData({ ...formData, date_format: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({tenantSettings?.date_format})</option>
              {options?.dateFormats.map(df => (
                <option key={df.value} value={df.value}>{df.label}</option>
              ))}
            </select>
          </div>
          
          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
              {isOverridden('time_format') && <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Overridden</span>}
            </label>
            <select
              value={formData.time_format || ''}
              onChange={(e) => setFormData({ ...formData, time_format: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inherit from tenant ({tenantSettings?.time_format === '12h' ? '12-hour' : '24-hour'})</option>
              {options?.timeFormats.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Effective Settings Preview */}
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-purple-900 mb-3">Effective Settings for This Agent</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-purple-600 font-medium">Timezone:</span>
            <p className="text-purple-900">{getEffective('timezone')}</p>
          </div>
          <div>
            <span className="text-purple-600 font-medium">Language:</span>
            <p className="text-purple-900">{options?.languages.find(l => l.value === getEffective('language'))?.label || getEffective('language')}</p>
          </div>
          <div>
            <span className="text-purple-600 font-medium">Measurement:</span>
            <p className="text-purple-900">{getEffective('measurement_system')}</p>
          </div>
          <div>
            <span className="text-purple-600 font-medium">Currency:</span>
            <p className="text-purple-900">{getEffective('currency')}</p>
          </div>
          <div>
            <span className="text-purple-600 font-medium">Date Format:</span>
            <p className="text-purple-900">{getEffective('date_format')}</p>
          </div>
          <div>
            <span className="text-purple-600 font-medium">Time Format:</span>
            <p className="text-purple-900">{getEffective('time_format') === '12h' ? '12-hour' : '24-hour'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4" />
          Clear All Overrides
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Overrides'}
        </button>
      </div>
    </div>
  );
}
