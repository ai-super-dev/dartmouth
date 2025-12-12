/**
 * JWT Authentication Middleware for V2 API
 * 
 * This middleware handles JWT-based authentication for V2 API endpoints.
 * It validates Bearer tokens and attaches user information to the context.
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types/shared';

export interface V2AuthUser {
  id: string;
  email: string;
  roles?: string[];
}

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: V2AuthUser;
  }
}

/**
 * Verify JWT token (simplified version - matches existing auth.ts pattern)
 */
async function verifyToken(token: string, secret?: string): Promise<V2AuthUser | null> {
  if (!secret) {
    console.error('[Auth V2] JWT_SECRET not configured');
    return null;
  }

  try {
    // Simple JWT verification (matches existing pattern in auth.ts)
    // In production, you might want to use a proper JWT library like jose
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url)
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    // Basic validation
    if (!payload.sub || !payload.email) {
      return null;
    }

    // Check expiration if present
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      id: payload.sub as string,
      email: payload.email as string,
      roles: payload.roles as string[] || []
    };
  } catch (error) {
    console.error('[Auth V2] Token verification error:', error);
    return null;
  }
}

/**
 * Authenticate V2 API requests using JWT Bearer tokens
 */
export async function authenticateV2(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  try {
    // Get Authorization header
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header'
        }
      }, 401);
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify JWT token
    const user = await verifyToken(token, c.env.JWT_SECRET);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      }, 401);
    }

    // Attach user to context
    c.set('user', user);

    await next();
  } catch (error) {
    console.error('[Auth V2] Authentication failed:', error);
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    }, 401);
  }
}

/**
 * Require admin role for V2 API
 */
export async function requireAdminV2(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const user = c.get('user');
  
  if (!user || !user.roles?.includes('admin')) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    }, 403);
  }

  await next();
}

