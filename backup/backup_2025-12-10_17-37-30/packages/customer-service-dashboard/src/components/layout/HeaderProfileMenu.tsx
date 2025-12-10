import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

type AvailabilityStatus = 'online' | 'offline' | 'away';

const statusConfig = {
  online: {
    color: 'bg-green-500',
    ringColor: 'ring-green-400',
    label: 'Online',
  },
  away: {
    color: 'bg-yellow-500',
    ringColor: 'ring-yellow-400',
    label: 'Away',
  },
  offline: {
    color: 'bg-gray-400',
    ringColor: 'ring-gray-400',
    label: 'Offline',
  }
};

export default function HeaderProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch current staff data
  const { data: staffData } = useQuery({
    queryKey: ['currentStaff'],
    queryFn: () => staffApi.me().then(res => res.data.staff),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Update availability mutation
  const updateAvailability = useMutation({
    mutationFn: (status: AvailabilityStatus) => 
      staffApi.updateAvailability(user?.id || '', status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStaff'] });
    }
  });

  const currentStatus = (staffData?.availability_status as AvailabilityStatus) || 'offline';
  const statusInfo = statusConfig[currentStatus];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
        {/* Status Indicator (left of avatar) */}
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
          {currentStatus === 'online' && (
            <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${statusInfo.color} animate-ping opacity-50`} />
          )}
        </div>
        
        {/* Avatar */}
        <div className="relative">
          {staffData?.avatar_url ? (
            <img 
              src={staffApi.getAvatarUrl(staffData.avatar_url) || ''} 
              alt={`${staffData.first_name} ${staffData.last_name}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {staffData?.first_name?.[0] || user?.firstName?.[0] || 'U'}
              {staffData?.last_name?.[0] || user?.lastName?.[0] || ''}
            </div>
          )}
        </div>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {staffData?.avatar_url ? (
                <img 
                  src={staffApi.getAvatarUrl(staffData.avatar_url) || ''} 
                  alt={`${staffData.first_name} ${staffData.last_name}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {staffData?.first_name?.[0]}{staffData?.last_name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {staffData?.first_name} {staffData?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{staffData?.email}</p>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="px-2 py-2 border-b border-gray-100">
            <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
            {(Object.keys(statusConfig) as AvailabilityStatus[]).map((status) => {
              const config = statusConfig[status];
              const isActive = status === currentStatus;
              
              return (
                <button
                  key={status}
                  onClick={() => updateAvailability.mutate(status)}
                  disabled={updateAvailability.isPending}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                  <span className="text-sm font-medium flex-1">{config.label}</span>
                  {isActive && (
                    <CheckIcon className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Menu Items */}
          <div className="px-2 py-2">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => navigate('/account')}
                  className={`${
                    active ? 'bg-gray-50' : ''
                  } flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 rounded-lg`}
                >
                  <UserCircleIcon className="w-5 h-5 text-gray-400" />
                  My Account
                </button>
              )}
            </Menu.Item>
          </div>

          {/* Logout */}
          <div className="px-2 py-2 border-t border-gray-100">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`${
                    active ? 'bg-red-50' : ''
                  } flex items-center gap-3 w-full px-2 py-2 text-sm text-red-600 rounded-lg`}
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  Sign Out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

