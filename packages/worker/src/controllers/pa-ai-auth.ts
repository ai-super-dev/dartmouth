/**
 * PA_AI Authentication Controller
 * Handles registration, login, and profile management for PA_AI mobile app
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import { generateToken } from '../middleware/auth';

// Simple password hashing (for Cloudflare Workers)
// In production, use Web Crypto API or a Workers-compatible library
async function hashPassword(password: string, salt: string = 'dartmouth-salt'): Promise<string> {
  // TODO: Replace with proper bcrypt or Web Crypto API implementation
  // For now, using a simple hash (TEMPORARY - MUST FIX FOR PRODUCTION)
  // Ensure salt is not empty
  if (!salt || salt.length === 0) {
    salt = 'dartmouth-salt';
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

/**
 * Register new user
 * POST /api/pa-ai/auth/register
 */
export async function register(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { email, password, name, phoneNumber, timezone } = body;

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password strength
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(`
      SELECT user_id FROM pa_ai_users WHERE email = ?
    `).bind(email).first();

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    // Generate user ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Hash password (using JWT_SECRET as salt if available and not empty)
    const salt = (c.env.JWT_SECRET && c.env.JWT_SECRET.length > 0) ? c.env.JWT_SECRET : 'dartmouth-salt';
    const passwordHash = await hashPassword(password, salt);

    // Create user profile with default values
    const defaultSafeTimes = JSON.stringify({
      enabled: true,
      defaultStart: '22:00',
      defaultEnd: '07:00',
      allowUrgent: true,
      customSchedule: {},
    });

    const defaultNotificationSettings = JSON.stringify({
      pushEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      taskReminders: true,
      calendarReminders: true,
      locationReminders: true,
      familyMessages: true,
      proactiveNotifications: true,
    });

    const defaultVoiceSettings = JSON.stringify({
      wakeWordEnabled: true,
      wakeWord: 'Hey McCarthy',
      voiceRecognitionLanguage: 'en-AU',
      ttsVoice: 'en-AU-Wavenet-A',
      ttsSpeed: 1.0,
    });

    const defaultPrivacy = JSON.stringify({
      locationSharingEnabled: true,
      activitySharingEnabled: true,
      readReceiptsEnabled: true,
      typingIndicatorEnabled: true,
    });

    const defaultCalendarIntegration = JSON.stringify({
      provider: 'google',
      connected: false,
      lastSync: null,
      syncFrequency: 15,
    });

    // Insert user
    await c.env.DB.prepare(`
      INSERT INTO pa_ai_users (
        user_id, email, password_hash, name, phone_number,
        timezone, currency, locale,
        group_ids, default_group_id,
        safe_times, notification_settings, voice_settings,
        privacy, calendar_integration, preferred_stores,
        created_at, updated_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      email,
      passwordHash,
      name,
      phoneNumber || null,
      timezone || 'Australia/Sydney',
      'AUD',
      'en-AU',
      JSON.stringify([]),  // group_ids
      null,  // default_group_id
      defaultSafeTimes,
      defaultNotificationSettings,
      defaultVoiceSettings,
      defaultPrivacy,
      defaultCalendarIntegration,
      JSON.stringify([]),  // preferred_stores
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    // Generate JWT token (use default secret if JWT_SECRET is not set)
    const jwtSecret = (c.env.JWT_SECRET && c.env.JWT_SECRET.length > 0) ? c.env.JWT_SECRET : 'dartmouth-jwt-secret-change-in-production';
    const token = await generateToken(
      { id: userId, email, role: 'user' },
      jwtSecret
    );

    // Get created user
    const user = await c.env.DB.prepare(`
      SELECT user_id, email, name, phone_number, profile_photo_url,
             timezone, currency, locale, created_at
      FROM pa_ai_users
      WHERE user_id = ?
    `).bind(userId).first();

      return c.json({
        token,
        user: {
          id: user.user_id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phone_number,
          profilePhotoUrl: user.profile_photo_url,
          timezone: user.timezone,
          currency: user.currency,
          locale: user.locale,
          createdAt: user.created_at,
        },
      }, 201);
  } catch (error) {
    console.error('[PA_AI Auth] Register error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[PA_AI Auth] Error details:', { errorMessage, errorStack });
    return c.json({ 
      error: 'Internal server error',
      details: errorMessage,
      // Only include stack in development
      ...(c.env.ENVIRONMENT === 'development' ? { stack: errorStack } : {})
    }, 500);
  }
}

/**
 * Login
 * POST /api/pa-ai/auth/login
 */
export async function login(c: Context<{ Bindings: Env }>) {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    // Get user from database
    const user = await c.env.DB.prepare(`
      SELECT user_id, email, password_hash, name, phone_number, profile_photo_url,
             timezone, currency, locale, status, created_at
      FROM pa_ai_users
      WHERE email = ?
    `).bind(email).first();

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
      return c.json({ error: 'Account is inactive' }, 401);
    }

    // Verify password
    const valid = await comparePassword(password, user.password_hash as string);
    
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Update last active
    await c.env.DB.prepare(`
      UPDATE pa_ai_users
      SET last_active_at = ?
      WHERE user_id = ?
    `).bind(new Date().toISOString(), user.user_id).run();

    // Generate JWT token (use default secret if JWT_SECRET is not set)
    const jwtSecret = (c.env.JWT_SECRET && c.env.JWT_SECRET.length > 0) ? c.env.JWT_SECRET : 'dartmouth-jwt-secret-change-in-production';
    const token = await generateToken(
      { id: user.user_id as string, email: user.email as string, role: 'user' },
      jwtSecret
    );

    return c.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phone_number,
        profilePhotoUrl: user.profile_photo_url,
        timezone: user.timezone,
        currency: user.currency,
        locale: user.locale,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('[PA_AI Auth] Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get current user profile
 * GET /api/pa-ai/profile
 */
export async function getProfile(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string; role: string };

    const profile = await c.env.DB.prepare(`
      SELECT 
        user_id, email, name, phone_number, profile_photo_url,
        group_ids, default_group_id,
        timezone, home_address, work_address,
        currency, locale, default_shopping_list_id,
        safe_times, notification_settings, voice_settings,
        privacy, calendar_integration, preferred_stores,
        llm_provider, conversation_style, theme,
        created_at, updated_at, last_active_at, app_version
      FROM pa_ai_users
      WHERE user_id = ?
    `).bind(user.id).first();

    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        id: profile.user_id,
        email: profile.email,
        name: profile.name,
        phoneNumber: profile.phone_number,
        profilePhotoUrl: profile.profile_photo_url,
        groupIds: profile.group_ids ? JSON.parse(profile.group_ids as string) : [],
        defaultGroupId: profile.default_group_id,
        timezone: profile.timezone,
        homeAddress: profile.home_address,
        workAddress: profile.work_address,
        currency: profile.currency,
        locale: profile.locale,
        defaultShoppingListId: profile.default_shopping_list_id,
        safeTimes: profile.safe_times ? JSON.parse(profile.safe_times as string) : {},
        notificationSettings: profile.notification_settings ? JSON.parse(profile.notification_settings as string) : {},
        voiceSettings: profile.voice_settings ? JSON.parse(profile.voice_settings as string) : {},
        privacy: profile.privacy ? JSON.parse(profile.privacy as string) : {},
        calendarIntegration: profile.calendar_integration ? JSON.parse(profile.calendar_integration as string) : {},
        preferredStores: profile.preferred_stores ? JSON.parse(profile.preferred_stores as string) : [],
        llmProvider: profile.llm_provider,
        conversationStyle: profile.conversation_style,
        theme: profile.theme,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        lastActiveAt: profile.last_active_at,
        appVersion: profile.app_version,
      },
    });
  } catch (error) {
    console.error('[PA_AI] Get profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Update user profile
 * PUT /api/pa-ai/profile
 */
export async function updateProfile(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string; role: string };
    const updates = await c.req.json();

    // Build update query dynamically
    const allowedFields = [
      'name', 'phone_number', 'profile_photo_url',
      'timezone', 'home_address', 'work_address',
      'currency', 'locale', 'default_shopping_list_id',
      'safe_times', 'notification_settings', 'voice_settings',
      'privacy', 'calendar_integration', 'preferred_stores',
      'llm_provider', 'conversation_style', 'theme',
      'group_ids', 'default_group_id',
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (typeof value === 'object' && value !== null) {
          updateFields.push(`${dbKey} = ?`);
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${dbKey} = ?`);
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Add updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());

    // Add user_id for WHERE clause
    updateValues.push(user.id);

    await c.env.DB.prepare(`
      UPDATE pa_ai_users
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
    `).bind(...updateValues).run();

    // Return updated profile
    return await getProfile(c);
  } catch (error) {
    console.error('[PA_AI] Update profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

