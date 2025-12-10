import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface SettingsOption {
  title: string;
  description: string;
  path: string;
  icon?: React.ReactNode;
  category: string;
}

const settingsOptions: SettingsOption[] = [
  // System
  {
    title: 'Dartmouth OS',
    description: 'Global system settings including timezone, language, currency, and regional preferences',
    path: '/settings/dartmouth-os',
    category: 'System',
  },
  // Business
  {
    title: 'Operational Hours',
    description: 'Set your business operating hours for live chat availability',
    path: '/settings/business-hours',
    category: 'Business',
  },
  {
    title: 'Auto-Assignment',
    description: 'Configure automatic ticket assignment to online staff members',
    path: '/settings/auto-assignment',
    category: 'Business',
  },
  // AI Agent
  {
    title: 'Widget & Embed',
    description: 'Configure the chat widget appearance and get embed code for your website',
    path: '/ai-agent/widget',
    category: 'AI Agent',
  },
  {
    title: 'RAG Knowledge',
    description: 'Upload and manage documents for AI to reference when answering questions',
    path: '/ai-agent/knowledge',
    category: 'AI Agent',
  },
  {
    title: 'System Message',
    description: 'Define AI agent personality, role, responsibilities, and guidelines',
    path: '/ai-agent/system-message',
    category: 'AI Agent',
  },
  {
    title: 'Regional Overrides',
    description: 'Override regional settings for specific AI agents',
    path: '/ai-agent/regional-overrides',
    category: 'AI Agent',
  },
  // Integrations
  {
    title: 'Print ERP',
    description: 'Connect and configure your Print ERP system integration',
    path: '/settings/integrations/perp',
    category: 'Integrations',
  },
  {
    title: 'Shopify',
    description: 'Connect and configure your Shopify store integration',
    path: '/settings/integrations/shopify',
    category: 'Integrations',
  },
  // Meta
  {
    title: 'Facebook',
    description: 'Connect your Facebook page for customer support',
    path: '/settings/meta/facebook',
    category: 'Meta',
  },
  {
    title: 'Instagram',
    description: 'Connect your Instagram business account for DMs',
    path: '/settings/meta/instagram',
    category: 'Meta',
  },
  {
    title: 'Messenger',
    description: 'Configure Facebook Messenger integration',
    path: '/settings/meta/messenger',
    category: 'Meta',
  },
  {
    title: 'WhatsApp',
    description: 'Connect WhatsApp Business for customer messaging',
    path: '/settings/meta/whatsapp',
    category: 'Meta',
  },
  // General
  {
    title: 'Auth & Security',
    description: 'Authentication settings, password policies, and security options',
    path: '/settings/general/auth',
    category: 'General',
  },
  {
    title: 'Templates',
    description: 'Manage email templates and canned responses',
    path: '/settings/general/templates',
    category: 'General',
  },
  {
    title: 'Tags',
    description: 'Manage ticket tags for categorization and filtering',
    path: '/settings/general/tags',
    category: 'General',
  },
  // Billing
  {
    title: 'Subscription',
    description: 'Manage your subscription plan and billing details',
    path: '/settings/billing/subscription',
    category: 'Billing',
  },
  {
    title: 'Transactions',
    description: 'View billing history and transaction records',
    path: '/settings/billing/transactions',
    category: 'Billing',
  },
];

export default function SettingsHubPage() {
  const navigate = useNavigate();

  // Group settings by category
  const groupedSettings = settingsOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, SettingsOption[]>);

  const categoryOrder = ['System', 'Business', 'AI Agent', 'Integrations', 'Meta', 'General', 'Billing'];

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'System':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'Business':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'AI Agent':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'Integrations':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        );
      case 'Meta':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        );
      case 'General':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'Billing':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return <Cog6ToothIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your system settings and integrations
        </p>
      </div>

      {categoryOrder.map((category) => (
        groupedSettings[category] && (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              {getCategoryIcon(category)}
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedSettings[category].map((option) => (
                <button
                  key={option.path}
                  onClick={() => navigate(option.path)}
                  className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <Cog6ToothIcon className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

