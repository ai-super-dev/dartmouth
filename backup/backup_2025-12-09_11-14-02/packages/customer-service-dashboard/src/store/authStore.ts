import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * ROLES:
 * - admin: Full access to everything
 * - manager: Everything except Settings
 * - customer_service: Tickets, AI Chat, Group Chat, Customers
 * - general: Group Chat, Customers only
 */
export type UserRole = 'admin' | 'manager' | 'customer_service' | 'general';

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

// Define permissions for each feature area
export const PERMISSIONS = {
  // Tickets
  'tickets:view': ['admin', 'manager', 'customer_service'],
  'tickets:create': ['admin', 'manager', 'customer_service'],
  'tickets:edit': ['admin', 'manager', 'customer_service'],
  'tickets:delete': ['admin'],
  'tickets:assign': ['admin', 'manager'],
  'tickets:bulk_assign': ['admin', 'manager'],
  
  // AI Chat
  'chat:view': ['admin', 'manager', 'customer_service'],
  'chat:respond': ['admin', 'manager', 'customer_service'],
  'chat:takeover': ['admin', 'manager', 'customer_service'],
  
  // Group Chat (internal staff chat)
  'group_chat:view': ['admin', 'manager', 'customer_service', 'general'],
  'group_chat:send': ['admin', 'manager', 'customer_service', 'general'],
  
  // Customers
  'customers:view': ['admin', 'manager', 'customer_service', 'general'],
  'customers:edit': ['admin', 'manager', 'customer_service'],
  
  // Staff
  'staff:view': ['admin', 'manager'],
  'staff:create': ['admin'],
  'staff:edit': ['admin'],
  'staff:delete': ['admin'],
  
  // Analytics
  'analytics:view': ['admin', 'manager'],
  
  // Settings (Admin only)
  'settings:view': ['admin'],
  'settings:edit': ['admin'],
  
  // AI Agent Config
  'ai_agent:view': ['admin', 'manager'],
  'ai_agent:edit': ['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'manager': return 'Manager';
    case 'customer_service': return 'Customer Service';
    case 'general': return 'General';
    default: return role;
  }
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
  hasPermission: (permission: Permission) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        // Map legacy 'agent' role to 'customer_service'
        const mappedUser = {
          ...user,
          role: user.role === 'agent' as any ? 'customer_service' : user.role
        };
        set({ token, user: mappedUser });
      },
      logout: () => set({ token: null, user: null }),
      hasPermission: (permission: Permission) => {
        const user = get().user;
        return hasPermission(user?.role, permission);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
