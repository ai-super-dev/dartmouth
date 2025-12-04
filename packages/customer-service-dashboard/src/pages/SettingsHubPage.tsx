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
  // Dartmouth OS
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
  // Templates
  {
    title: 'Email Templates',
    description: 'Create and manage reusable email templates for common responses',
    path: '/settings/templates/email',
    category: 'Templates',
  },
  {
    title: 'Canned Responses',
    description: 'Quick response snippets for frequently asked questions',
    path: '/settings/templates/canned',
    category: 'Templates',
  },
  // Tags
  {
    title: 'Tags',
    description: 'Manage ticket tags for categorization and filtering',
    path: '/settings/tags',
    category: 'Tags',
  },
  // AI Agent
  {
    title: 'AI Widget & Embed',
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
  // Security & Integrations
  {
    title: 'Auth & Security',
    description: 'Authentication settings, password policies, and security options',
    path: '/settings/auth',
    category: 'Security & Integrations',
  },
  {
    title: 'Shopify',
    description: 'Connect and configure your Shopify store integration',
    path: '/settings/shopify',
    category: 'Security & Integrations',
  },
  {
    title: 'PERP Integration',
    description: 'Configure PERP system integration settings',
    path: '/settings/perp',
    category: 'Security & Integrations',
  },
  {
    title: 'Other Integrations',
    description: 'Manage third-party integrations and API connections',
    path: '/settings/integrations',
    category: 'Security & Integrations',
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

  const categoryOrder = ['System', 'Business', 'Templates', 'Tags', 'AI Agent', 'Security & Integrations'];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your Dartmouth OS system settings and preferences
        </p>
      </div>

      {categoryOrder.map((category) => (
        groupedSettings[category] && (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
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

