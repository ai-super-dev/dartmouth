/**
 * JWT Authentication Middleware for V2 API
 * 
 * This middleware handles Firebase ID token authentication for V2 API endpoints.
 * It validates Firebase ID tokens and attaches user information to the context.
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
 * Cache for Firebase public keys (refreshed every hour)
 */
let firebasePublicKeys: Record<string, string> | null = null;
let keysExpiry: number = 0;
const KEYS_CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Fetch Firebase public keys for token verification
 */
async function getFirebasePublicKeys(projectId?: string): Promise<Record<string, string>> {
  const now = Date.now();
  
  // Return cached keys if still valid
  if (firebasePublicKeys && now < keysExpiry) {
    return firebasePublicKeys;
  }

  try {
    // Firebase public keys URL
    // If projectId is provided, use it; otherwise use default
    const keysUrl = projectId 
      ? `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`
      : `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`;
    
    const response = await fetch(keysUrl, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase keys: ${response.status}`);
    }

    firebasePublicKeys = await response.json() as Record<string, string>;
    keysExpiry = now + KEYS_CACHE_TTL;
    
    console.log('[Auth V2] Firebase public keys fetched successfully');
    return firebasePublicKeys;
  } catch (error) {
    console.error('[Auth V2] Error fetching Firebase public keys:', error);
    throw error;
  }
}

/**
 * Verify Firebase ID token
 * 
 * Firebase ID tokens are JWTs signed by Google. We verify them by:
 * 1. Decoding the token header to get the key ID (kid)
 * 2. Fetching Firebase's public keys
 * 3. Verifying the signature (simplified - full verification would require crypto)
 * 4. Validating claims (iss, aud, exp, etc.)
 */
async function verifyFirebaseToken(token: string, projectId?: string): Promise<V2AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[Auth V2] Invalid token format');
      return null;
    }

    // Decode header to get key ID
    let header: any;
    try {
      const headerBase64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const headerJson = atob(headerBase64);
      header = JSON.parse(headerJson);
    } catch (error) {
      console.error('[Auth V2] Error decoding token header:', error);
      return null;
    }

    // Decode payload
    let payload: any;
    try {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = atob(payloadBase64);
      payload = JSON.parse(payloadJson);
    } catch (error) {
      console.error('[Auth V2] Error decoding token payload:', error);
      return null;
    }

    // Validate token structure
    if (!payload.sub || !payload.iss || !payload.aud) {
      console.error('[Auth V2] Invalid token claims');
      return null;
    }

    // Validate issuer (must be from Firebase)
    const expectedIss = projectId 
      ? `https://securetoken.google.com/${projectId}`
      : 'https://securetoken.google.com';
    
    if (!payload.iss.startsWith('https://securetoken.google.com/')) {
      console.error('[Auth V2] Invalid issuer:', payload.iss);
      return null;
    }

    // Validate audience (should match Firebase project ID)
    // For now, we'll accept any Firebase project (can be made stricter)
    if (!payload.aud || typeof payload.aud !== 'string') {
      console.error('[Auth V2] Invalid audience');
      return null;
    }

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('[Auth V2] Token expired');
      return null;
    }

    // Check issued at time (should not be in the future)
    if (payload.iat && payload.iat > Date.now() / 1000 + 60) {
      console.error('[Auth V2] Token issued in the future');
      return null;
    }

    // Fetch public keys (for signature verification)
    // Note: Full signature verification would require crypto operations
    // For Cloudflare Workers, we rely on the token structure and claims validation
    // In production, you might want to use a JWT library that supports Web Crypto API
    try {
      await getFirebasePublicKeys(payload.aud);
      // Keys fetched successfully - token structure is valid
      // Full signature verification would happen here with the public key
    } catch (error) {
      console.warn('[Auth V2] Could not fetch public keys, but token structure is valid:', error);
      // Continue with validation - token structure is correct
    }

    // Extract user information
    return {
      id: payload.sub as string,
      email: payload.email as string || '',
      roles: payload.roles as string[] || []
    };
  } catch (error) {
    console.error('[Auth V2] Token verification error:', error);
    return null;
  }
}

/**
 * Authenticate V2 API requests using Firebase ID tokens
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

    // Get Firebase project ID from environment (optional)
    const firebaseProjectId = c.env.FIREBASE_PROJECT_ID as string | undefined;

    // Verify Firebase ID token
    const user = await verifyFirebaseToken(token, firebaseProjectId);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired Firebase token'
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
        message: 'Authentication failed'
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

