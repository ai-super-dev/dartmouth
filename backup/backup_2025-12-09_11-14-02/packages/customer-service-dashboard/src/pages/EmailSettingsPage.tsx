import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, Eye, Settings, Upload, Image, Building2, Globe } from 'lucide-react';
import { signaturesApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [previewHtml, setPreviewHtml] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields for signature builder
  const [companyName, setCompanyName] = useState('Amazing Transfers');
  const [email, setEmail] = useState('info@amazingtransfers.com.au');
  const [website, setWebsite] = useState('amazingtransfers.com');

  // Fetch signature settings
  const { data: signatureData, isLoading } = useQuery({
    queryKey: ['email-signature-settings'],
    queryFn: async () => {
      const response = await signaturesApi.getSettings();
      return response.data;
    },
  });

  // Load settings when data arrives
  useEffect(() => {
    if (signatureData) {
      setLogoUrl(signatureData.logoUrl ?? '');
      setCompanyName(signatureData.companyName ?? 'Amazing Transfers');
      setEmail(signatureData.email ?? 'info@amazingtransfers.com.au');
      setWebsite(signatureData.website ?? 'amazingtransfers.com');
    }
  }, [signatureData]);

  // Fetch preview whenever form fields change
  const { data: previewData } = useQuery({
    queryKey: ['email-signature-preview', logoUrl, companyName, email, website],
    queryFn: async () => {
      const response = await signaturesApi.getPreviewFromSettings({
        logoUrl,
        companyName,
        email,
        website,
      });
      return response.data;
    },
    enabled: !!companyName && !!email,
  });

  useEffect(() => {
    if (previewData?.signatureHtml) {
      setPreviewHtml(previewData.signatureHtml);
    }
  }, [previewData]);

  // Save signature mutation
  const saveMutation = useMutation({
    mutationFn: () => signaturesApi.saveSettings({
      logoUrl,
      companyName,
      email,
      website,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signature-settings'] });
      queryClient.invalidateQueries({ queryKey: ['email-signature-preview'] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Upload to backend
        const response = await signaturesApi.uploadLogo({
          name: file.name,
          data: base64,
          type: file.type,
          size: file.size,
        });

        const uploadedUrl = response.data.logoUrl;
        setLogoUrl(uploadedUrl);
        
        alert(`Logo uploaded successfully!\n\nURL: ${uploadedUrl}\n\nYou can now use this URL in your signature template.`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload failed:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-7 h-7" />
          Email Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure email signature template for all staff members
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Builder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Signature Builder
            </h2>
            
            {/* Logo Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Company Logo
              </h3>
              <p className="text-xs text-blue-800 mb-3">
                Upload your logo - it will be hosted on Cloudflare and automatically included in your signature.
              </p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Upload className="w-4 h-4" />
                {isUploadingLogo ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <div className="mt-3 flex items-center gap-2">
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain border border-gray-300 rounded bg-white p-1" />
                  <p className="text-xs text-green-700">✓ Logo uploaded</p>
                </div>
              )}
            </div>
            
            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Amazing Transfers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., info@amazingtransfers.com.au"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., amazingtransfers.com"
                />
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> Staff names and job titles are automatically pulled from their profile settings.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-5 h-5" />
                {saveMutation.isPending ? 'Saving...' : 'Save Signature'}
              </button>
              {saveMutation.isSuccess && (
                <p className="text-sm text-green-600 mt-2 text-center">✓ Signature saved successfully!</p>
              )}
              {saveMutation.isError && (
                <p className="text-sm text-red-600 mt-2 text-center">✗ Failed to save signature.</p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview (Your Signature)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This is how the signature will appear for <strong>{user?.firstName} {user?.lastName}</strong>
            </p>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div 
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="prose prose-sm max-w-none"
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload your company logo (stored on Cloudflare)</li>
                <li>• Set your company name, email, and website</li>
                <li>• Staff names and job titles are pulled from their profiles automatically</li>
                <li>• Signatures are auto-appended to all email ticket replies</li>
                <li>• Each staff member gets a personalized signature</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

