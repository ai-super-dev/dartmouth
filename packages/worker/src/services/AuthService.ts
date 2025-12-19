/**
 * AuthService - JWT Authentication for V2 API
 * 
 * Handles user authentication and token management:
 * - Login with email/password
 * - JWT token generation
 * - Token refresh
 * - Token validation
 * - Logout (token invalidation)
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { AuthConfig, UserProfile } from '@agent-army/integration-services';

export interface LoginResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface TokenRefreshResult {
  token: string;
  expiresIn: number;
}

export class AuthService {
  private config: AuthConfig;
  private db: D1Database;

  constructor(config: AuthConfig, db: D1Database) {
    this.config = config;
    this.db = db;
  }

  /**
   * Login user and generate tokens
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user in database
    const user = await this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<{
      user_id: string;
      email: string;
      name: string;
      password_hash: string;
      timezone?: string;
      created_at: string;
      last_active_at?: string;
    }>();

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password (assuming hashed with SHA-256)
    const hashedPassword = await this.hashPassword(password);
    if (user.password_hash !== hashedPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const token = await this.generateToken(user.user_id, user.email, 'access');
    const refreshToken = await this.generateToken(user.user_id, user.email, 'refresh');

    // Update last active
    await this.db.prepare(
      'UPDATE users SET last_active_at = ? WHERE user_id = ?'
    ).bind(new Date().toISOString(), user.user_id).run();

    return {
      token,
      refreshToken,
      expiresIn: this.config.tokenExpiry,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        createdAt: user.created_at,
        lastActiveAt: user.last_active_at
      }
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const payload = await this.verifyToken(refreshToken);
      
      if (!payload || payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const newToken = await this.generateToken(payload.sub, payload.email, 'access');

      return {
        token: newToken,
        expiresIn: this.config.tokenExpiry
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Validate access token
   */
  async validateToken(token: string): Promise<{ sub: string; email: string; type: string }> {
    try {
      const payload = await this.verifyToken(token);
      
      if (!payload || payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        type: payload.type
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Logout (invalidate token)
   * In a real implementation, you'd add the token to a blacklist
   */
  async logout(token: string): Promise<void> {
    // For now, just validate the token exists
    // In production, add to blacklist or use Redis for token invalidation
    await this.validateToken(token);
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token: string): Promise<UserProfile> {
    const payload = await this.validateToken(token);
    
    const user = await this.db.prepare(
      'SELECT * FROM users WHERE user_id = ?'
    ).bind(payload.sub).first<{
      user_id: string;
      email: string;
      name: string;
      timezone?: string;
      created_at: string;
      last_active_at?: string;
    }>();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.user_id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      createdAt: user.created_at,
      lastActiveAt: user.last_active_at
    };
  }

  /**
   * Generate JWT token
   */
  private async generateToken(userId: string, email: string, type: 'access' | 'refresh'): Promise<string> {
    const expiry = type === 'access' ? this.config.tokenExpiry : this.config.refreshExpiry;
    const payload = {
      sub: userId,
      email: email,
      type: type,
      exp: Math.floor(Date.now() / 1000) + expiry,
      iat: Math.floor(Date.now() / 1000)
    };

    // Simple JWT implementation (matches existing pattern)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const body = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const signature = await this.sign(`${header}.${body}`, this.config.jwtSecret);
    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${header}.${body}.${sig}`;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<{ sub: string; email: string; type: string; exp: number } | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [header, body, signature] = parts;

      // Verify signature
      const expectedSignature = await this.sign(`${header}.${body}`, this.config.jwtSecret);
      const sig = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      if (signature !== sig) {
        return null;
      }

      // Decode payload (base64url)
      const payload = JSON.parse(
        atob(body.replace(/-/g, '+').replace(/_/g, '/'))
      );

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return null;
    }
  }

  /**
   * Sign data with secret using HMAC-SHA256
   */
  private async sign(data: string, secret: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return await crypto.subtle.sign('HMAC', key, messageData);
  }

  /**
   * Hash password with SHA-256
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
}

