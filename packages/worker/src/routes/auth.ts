/**
 * Auth API Routes (V2)
 * 
 * Provides JWT authentication for V2 API:
 * - Login
 * - Refresh token
 * - Logout
 * - Get current user
 */

import { Hono } from 'hono';
import type { Env } from '../types/shared';
import { authenticateV2 } from '../middleware/auth-v2';
import { AuthService } from '../services/AuthService';

/**
 * Create Auth router
 */
export function createAuthV2Router() {
  const app = new Hono<{ Bindings: Env }>();

  // Initialize service helper
  const getAuthService = (env: Env) => {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    return new AuthService(
      {
        jwtSecret: env.JWT_SECRET,
        tokenExpiry: 3600,      // 1 hour
        refreshExpiry: 604800   // 7 days
      },
      env.DB
    );
  };

  /**
   * POST /api/v2/auth/login
   * Login with email and password
   */
  app.post('/api/v2/auth/login', async (c) => {
    try {
      const authService = getAuthService(c.env);
      const { email, password } = await c.req.json();

      if (!email || !password) {
        return c.json({
          error: {
            code: 'AUTH_ERROR',
            message: 'Email and password are required'
          }
        }, 400);
      }

      const result = await authService.login(email, password);

      return c.json(result);
    } catch (error) {
      console.error('Auth login error:', error);
      return c.json({
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Login failed'
        }
      }, 401);
    }
  });

  /**
   * POST /api/v2/auth/refresh
   * Refresh access token
   */
  app.post('/api/v2/auth/refresh', async (c) => {
    try {
      const authService = getAuthService(c.env);
      const { refreshToken } = await c.req.json();

      if (!refreshToken) {
        return c.json({
          error: {
            code: 'AUTH_ERROR',
            message: 'Refresh token is required'
          }
        }, 400);
      }

      const result = await authService.refresh(refreshToken);

      return c.json(result);
    } catch (error) {
      console.error('Auth refresh error:', error);
      return c.json({
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Token refresh failed'
        }
      }, 401);
    }
  });

  /**
   * POST /api/v2/auth/logout
   * Logout (invalidate token)
   */
  app.post('/api/v2/auth/logout', authenticateV2, async (c) => {
    try {
      const authService = getAuthService(c.env);
      const token = c.req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return c.json({
          error: {
            code: 'AUTH_ERROR',
            message: 'No token provided'
          }
        }, 400);
      }

      await authService.logout(token);

      return c.json({ success: true });
    } catch (error) {
      console.error('Auth logout error:', error);
      return c.json({
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Logout failed'
        }
      }, 401);
    }
  });

  /**
   * GET /api/v2/auth/me
   * Get current user
   */
  app.get('/api/v2/auth/me', authenticateV2, async (c) => {
    try {
      const authService = getAuthService(c.env);
      const token = c.req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return c.json({
          error: {
            code: 'AUTH_ERROR',
            message: 'No token provided'
          }
        }, 400);
      }

      const user = await authService.getCurrentUser(token);

      return c.json({ user });
    } catch (error) {
      console.error('Auth me error:', error);
      return c.json({
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get user'
        }
      }, 401);
    }
  });

  return app;
}

