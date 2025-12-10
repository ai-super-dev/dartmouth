import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { CheckIcon, ExclamationCircleIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/outline';

type AvailabilityStatus = 'online' | 'offline' | 'away';

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    description: 'Available for chats and tickets'
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away',
    description: 'Temporarily unavailable'
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    description: 'Not available for new assignments'
  }
};

export default function MyAccountPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    phone: '',
    department: '',
  });

  // Fetch current staff data
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['currentStaff'],
    queryFn: () => staffApi.me().then(res => res.data.staff),
    enabled: !!user,
  });

  // Update form when data loads
  useEffect(() => {
    if (staffData) {
      setFormData({
        first_name: staffData.first_name || '',
        last_name: staffData.last_name || '',
        email: staffData.email || '',
        job_title: staffData.job_title || '',
        phone: staffData.phone || '',
        department: staffData.department || '',
      });
    }
  }, [staffData]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: (data: typeof formData) => staffApi.update(user?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
      setSuccessMessage('Profile updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.error || 'Failed to update profile');
      setSuccessMessage('');
    }
  });

  // Update availability mutation
  const updateAvailability = useMutation({
    mutationFn: (status: AvailabilityStatus) => 
      staffApi.updateAvailability(user?.id || '', status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
      setSuccessMessage('Status updated!');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  });

  // Upload avatar mutation
  const uploadAvatar = useMutation({
    mutationFn: (file: File) => staffApi.uploadAvatar(user?.id || '', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] });
      setSuccessMessage('Photo uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.error || 'Failed to upload photo');
    }
  });

  // Delete avatar mutation
  const deleteAvatar = useMutation({
    mutationFn: () => staffApi.deleteAvatar(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] });
      setSuccessMessage('Photo removed');
      setTimeout(() => setSuccessMessage(''), 2000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.error || 'Failed to remove photo');
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Invalid file type. Please use JPEG, PNG, GIF, or WebP');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File too large. Maximum size is 5MB');
        return;
      }
      uploadAvatar.mutate(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const currentStatus = (staffData?.availability_status as AvailabilityStatus) || 'offline';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile information and availability status
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                {staffData?.avatar_url ? (
                  <img 
                    src={staffApi.getAvatarUrl(staffData.avatar_url) || ''} 
                    alt={`${staffData.first_name} ${staffData.last_name}`}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {staffData?.first_name?.[0]}{staffData?.last_name?.[0]}
                  </div>
                )}
                {/* Status indicator */}
                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${statusConfig[currentStatus].color}`} />
                
                {/* Upload overlay */}
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-white hover:text-indigo-200 transition-colors"
                    title="Upload photo"
                  >
                    <CameraIcon className="w-6 h-6" />
                  </button>
                  {staffData?.avatar_url && (
                    <button
                      onClick={() => deleteAvatar.mutate()}
                      className="p-2 text-white hover:text-red-300 transition-colors"
                      title="Remove photo"
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  )}
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {/* Upload loading indicator */}
              {uploadAvatar.isPending && (
                <div className="mt-2 text-sm text-indigo-600 flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </div>
              )}
              
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {staffData?.first_name} {staffData?.last_name}
              </h2>
              <p className="text-sm text-gray-500">{staffData?.job_title || 'Team Member'}</p>
              <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                staffData?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {staffData?.role === 'admin' ? 'Administrator' : 'Staff'}
              </span>
            </div>

            {/* Status Selector */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Your Status</h3>
              <div className="space-y-2">
                {(Object.keys(statusConfig) as AvailabilityStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const isActive = status === currentStatus;
                  
                  return (
                    <button
                      key={status}
                      onClick={() => updateAvailability.mutate(status)}
                      disabled={updateAvailability.isPending}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        isActive 
                          ? 'bg-indigo-50 ring-2 ring-indigo-500' 
                          : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                      {isActive && (
                        <CheckIcon className="w-5 h-5 text-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Job Title */}
              <div>
                <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <input
                  type="text"
                  id="job_title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="e.g. Customer Support Specialist"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 0412 345 678"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a department</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Sales">Sales</option>
                  <option value="Production">Production</option>
                  <option value="Design">Design</option>
                  <option value="Management">Management</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfile.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Account Info Card */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Account ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user?.id?.slice(0, 8)}...</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{staffData?.role || 'Staff'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {staffData?.created_at ? new Date(staffData.created_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {staffData?.updated_at ? new Date(staffData.updated_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

