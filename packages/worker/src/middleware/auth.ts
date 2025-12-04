/**
 * Authentication Middleware
 * JWT-based authentication for API routes
 * 
 * ROLES:
 * - admin: Full access to everything
 * - manager: Everything except Settings
 * - customer_service: Tickets, AI Chat, Group Chat, Customers
 * - general: Group Chat, Customers only
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types/shared';

export type UserRole = 'admin' | 'manager' | 'customer_service' | 'general';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
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
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}

/**
 * Verify JWT token and attach user to context
 */
export async function authenticate(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  
  try {
    // Simple JWT verification (you can enhance this with proper JWT library)
    const user = await verifyToken(token, c.env.JWT_SECRET);
    
    if (!user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Attach user to context
    c.set('user', user);
    
    await next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  
  await next();
}

/**
 * Require manager or admin role
 */
export async function requireManagerOrAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return c.json({ error: 'Forbidden: Manager or Admin access required' }, 403);
  }
  
  await next();
}

/**
 * Require ticket access (admin, manager, or customer_service)
 */
export async function requireTicketAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || !hasPermission(user.role, 'tickets:view')) {
    return c.json({ error: 'Forbidden: You do not have access to tickets' }, 403);
  }
  
  await next();
}

/**
 * Require chat access (admin, manager, or customer_service)
 */
export async function requireChatAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || !hasPermission(user.role, 'chat:view')) {
    return c.json({ error: 'Forbidden: You do not have access to chat' }, 403);
  }
  
  await next();
}

/**
 * Require customer access (all roles)
 */
export async function requireCustomerAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || !hasPermission(user.role, 'customers:view')) {
    return c.json({ error: 'Forbidden: You do not have access to customers' }, 403);
  }
  
  await next();
}

/**
 * Require settings access (admin only)
 */
export async function requireSettingsAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || !hasPermission(user.role, 'settings:view')) {
    return c.json({ error: 'Forbidden: You do not have access to settings' }, 403);
  }
  
  await next();
}

/**
 * Require analytics access (admin, manager)
 */
export async function requireAnalyticsAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user || !hasPermission(user.role, 'analytics:view')) {
    return c.json({ error: 'Forbidden: You do not have access to analytics' }, 403);
  }
  
  await next();
}

/**
 * Create a permission checker middleware
 */
export function requirePermission(permission: Permission) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as AuthUser;
    
    if (!user || !hasPermission(user.role, permission)) {
      return c.json({ error: `Forbidden: Missing permission: ${permission}` }, 403);
    }
    
    await next();
  };
}

/**
 * Verify JWT token
 */
async function verifyToken(token: string, secret: string): Promise<AuthUser | null> {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (handle base64url)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    // Verify signature (simplified - use proper JWT library in production)
    const encoder = new TextEncoder();
    const data = encoder.encode(parts[0] + '.' + parts[1]);
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureData = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureData,
      data
    );

    if (!valid) {
      return null;
    }

    // Map legacy 'agent' role to 'customer_service'
    let role = payload.role as UserRole;
    if (role === 'agent' as any) {
      role = 'customer_service';
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: role
    };
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    return null;
  }
}

/**
 * Generate JWT token
 */
export async function generateToken(user: AuthUser, secret: string, expiresIn: number = 86400): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn
  };

  const encoder = new TextEncoder();
  
  // Encode header and payload
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Create signature
  const data = encoder.encode(headerB64 + '.' + payloadB64);
  const keyData = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
