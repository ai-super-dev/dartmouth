/**
 * Google OAuth Controller
 * 
 * Handles Google OAuth flow for per-user Google Calendar integration.
 * Each user authorizes access to their own Google Calendar.
 * The refresh token is stored in the database for persistent access.
 */

import { Context } from 'hono';
import type { Env } from '../types/shared';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Required scopes for Google Sign-In with Calendar and Gmail access
const GOOGLE_SCOPES = [
  'openid',
  'profile', 
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Get Google OAuth URL
 * GET /api/google/auth/url
 * 
 * Returns the URL to redirect user to for Google OAuth authorization
 */
export async function getAuthUrl(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string };
    const clientId = c.env.GOOGLE_CLIENT_ID;
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/google/auth/callback`;

    if (!clientId) {
      return c.json({
        success: false,
        error: 'Google OAuth is not configured. GOOGLE_CLIENT_ID is missing.',
      }, 500);
    }

    // Create state parameter with user ID for security
    const state = btoa(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    }));

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent to ensure we get refresh token
      state: state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    console.log('[Google OAuth] Generated auth URL for user:', user.id);

    return c.json({
      success: true,
      url: authUrl,
      message: 'Redirect user to this URL to authorize Google Calendar access',
    });
  } catch (error: any) {
    console.error('[Google OAuth] Error generating auth URL:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to generate auth URL',
    }, 500);
  }
}

/**
 * Handle OAuth Callback
 * GET /api/google/auth/callback
 * 
 * Exchanges authorization code for tokens and stores refresh token in database.
 * Supports two flows:
 * 1. Legacy flow: User ID in state, redirect to dartmouth://calendar-connect
 * 2. Mobile sign-in flow: appRedirect in state, include tokens in redirect
 */
export async function handleCallback(c: Context<{ Bindings: Env }>) {
  // Default app redirect
  let appRedirect = 'dartmouth://oauth-callback';
  let userId: string | null = null;
  
  // Parse state to get app redirect and/or user ID
  const state = c.req.query('state');
  if (state) {
    try {
      const stateData = JSON.parse(atob(state));
      console.log('[Google OAuth] Parsed state:', JSON.stringify(stateData));
      
      // Mobile flow: appRedirect in state
      if (stateData.appRedirect) {
        appRedirect = stateData.appRedirect;
      }
      
      // Legacy flow: userId in state
      if (stateData.userId) {
        userId = stateData.userId;
        // Validate timestamp (prevent replay attacks - 10 minute window)
        if (stateData.timestamp && Date.now() - stateData.timestamp > 600000) {
          console.error('[Google OAuth] State expired');
        }
      }
    } catch (e) {
      console.log('[Google OAuth] Could not parse state, using defaults:', e);
    }
  }
  
  console.log('[Google OAuth] App redirect URI:', appRedirect);
  
  const buildRedirectUrl = (params: Record<string, string>) => {
    // For deep links, we need to build the URL carefully
    const baseUrl = appRedirect.includes('?') ? appRedirect + '&' : appRedirect + '?';
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return baseUrl + queryString;
  };
  
  // Return an HTML page that redirects via JavaScript (works better with mobile deep links)
  const buildRedirect = (params: Record<string, string>) => {
    const redirectUrl = buildRedirectUrl(params);
    const isSuccess = params.success === 'true';
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${isSuccess ? 'Success!' : 'Error'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      background: ${isSuccess ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f5f5f5'};
      color: ${isSuccess ? 'white' : '#333'};
      text-align: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 400px;
    }
    h1 { color: ${isSuccess ? '#4CAF50' : '#f44336'}; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #007AFF;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }
    .btn:hover { background: #0056b3; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007AFF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${isSuccess ? '✓ Success!' : '✗ Error'}</h1>
    <p>${isSuccess ? 'Google account connected successfully!' : (params.error || 'Something went wrong')}</p>
    <div class="spinner" id="spinner"></div>
    <p id="redirect-msg">Returning to McCarthy app...</p>
    <a href="${redirectUrl}" class="btn" id="manual-btn" style="display:none;">
      Open McCarthy App
    </a>
  </div>
  <script>
    // Try to redirect immediately
    setTimeout(function() {
      window.location.href = "${redirectUrl}";
    }, 500);
    
    // After 3 seconds, show manual button if redirect didn't work
    setTimeout(function() {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('redirect-msg').textContent = 'If the app did not open, tap the button below:';
      document.getElementById('manual-btn').style.display = 'inline-block';
    }, 3000);
  </script>
</body>
</html>`;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  };

  try {
    const code = c.req.query('code');
    const error = c.req.query('error');

    // Handle OAuth errors
    if (error) {
      console.error('[Google OAuth] Authorization error:', error);
      return buildRedirect({ success: 'false', error: error });
    }

    if (!code) {
      return buildRedirect({ success: 'false', error: 'missing_code' });
    }

    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/google/auth/callback`;

    if (!clientId || !clientSecret) {
      return buildRedirect({ success: 'false', error: 'oauth_not_configured' });
    }

    // Exchange code for tokens
    console.log('[Google OAuth] Exchanging code for tokens...');
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', errorText);
      return buildRedirect({ success: 'false', error: 'token_exchange_failed', message: errorText });
    }

    const tokens = (await tokenResponse.json()) as TokenResponse & { id_token?: string };
    console.log('[Google OAuth] Token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!(tokens as any).id_token,
      refreshToken: tokens.refresh_token ? 'PRESENT (hidden)' : 'MISSING!',
      scopes: tokens.scope,
    });

    // If we have a user ID from state, update their calendar integration
    if (userId && tokens.refresh_token) {
      const calendarIntegration = JSON.stringify({
        provider: 'google',
        refreshToken: tokens.refresh_token,
        scopes: tokens.scope,
        connectedAt: new Date().toISOString(),
      });

      await c.env.DB.prepare(`
        UPDATE pa_ai_users
        SET calendar_integration = ?, updated_at = ?
        WHERE user_id = ?
      `).bind(calendarIntegration, new Date().toISOString(), userId).run();

      console.log('[Google OAuth] Updated calendar integration for user:', userId);
    }

    // For mobile sign-in flow, we need to find or create user by email from id_token
    console.log('[Google OAuth] Checking for ID token to process mobile flow...');
    console.log('[Google OAuth] Has ID token:', !!(tokens as any).id_token);
    
    if ((tokens as any).id_token) {
      // Decode the ID token to get user info
      try {
        const idTokenPayload = JSON.parse(atob((tokens as any).id_token.split('.')[1]));
        const email = idTokenPayload.email;
        const name = idTokenPayload.name || email?.split('@')[0] || 'User';
        const photoUrl = idTokenPayload.picture;
        
        console.log('[Google OAuth] Decoded ID token:', {
          email,
          name,
          hasPhoto: !!photoUrl,
        });
        
        if (email) {
          console.log('[Google OAuth] Mobile flow - looking up user by email:', email);
          
          // Find user by email
          let user = await c.env.DB.prepare(`
            SELECT user_id FROM pa_ai_users WHERE email = ?
          `).bind(email).first();
          
          if (user) {
            userId = user.user_id as string;
            console.log('[Google OAuth] Found existing user:', userId);
          } else {
            // Create new user if they don't exist
            userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();
            
            // Generate a random password hash for Google users
            const randomPassword = Math.random().toString(36).slice(-16) + 'Aa1!';
            const encoder = new TextEncoder();
            const data = encoder.encode(randomPassword);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            await c.env.DB.prepare(`
              INSERT INTO pa_ai_users (
                user_id, email, password_hash, name, profile_photo_url,
                timezone, currency, locale, created_at, updated_at, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              userId,
              email,
              passwordHash,
              name,
              photoUrl || null,
              'Australia/Sydney',
              'AUD',
              'en-AU',
              now,
              now,
              'active'
            ).run();
            
            console.log('[Google OAuth] Created new user:', userId);
          }
          
          // Store refresh token for this user
          if (tokens.refresh_token) {
            const calendarIntegration = JSON.stringify({
              provider: 'google',
              refreshToken: tokens.refresh_token,
              scopes: tokens.scope,
              connectedAt: new Date().toISOString(),
            });

            console.log('[Google OAuth] Attempting to store calendar integration for user:', userId);
            
            try {
              const updateResult = await c.env.DB.prepare(`
                UPDATE pa_ai_users
                SET calendar_integration = ?, updated_at = ?
                WHERE user_id = ?
              `).bind(calendarIntegration, new Date().toISOString(), userId).run();

              console.log('[Google OAuth] Database update result:', {
                userId,
                changes: updateResult.meta?.changes,
                success: updateResult.success,
              });
              
              // Verify the update worked
              const verifyResult = await c.env.DB.prepare(`
                SELECT calendar_integration FROM pa_ai_users WHERE user_id = ?
              `).bind(userId).first();
              
              console.log('[Google OAuth] Verification:', {
                userId,
                hasCalendarIntegration: !!verifyResult?.calendar_integration,
              });
            } catch (dbError) {
              console.error('[Google OAuth] Database update error:', dbError);
            }
          } else {
            console.warn('[Google OAuth] No refresh token received from Google - user needs to re-authorize with prompt=consent');
          }
        }
      } catch (e) {
        console.error('[Google OAuth] Failed to process ID token:', e);
      }
    }

    // Build redirect URL with tokens for mobile app
    const redirectParams: Record<string, string> = {
      success: 'true',
    };

    // Include tokens for mobile sign-in flow
    if ((tokens as any).id_token) {
      redirectParams.id_token = (tokens as any).id_token;
    }
    if (tokens.access_token) {
      redirectParams.access_token = tokens.access_token;
    }

    console.log('[Google OAuth] Redirecting to app with success');
    return buildRedirect(redirectParams);
  } catch (error: any) {
    console.error('[Google OAuth] Callback error:', error);
    return buildRedirect({ success: 'false', error: error.message || 'unknown_error' });
  }
}

/**
 * Get Google Auth Status
 * GET /api/google/auth/status
 * 
 * Check if user has connected Google Calendar
 */
export async function getAuthStatus(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string } | undefined;

    console.log('[Google OAuth] Auth status check for:', {
      userId: user?.id,
      email: user?.email,
      hasUser: !!user,
    });

    // If no user, return not connected
    if (!user || (!user.id && !user.email)) {
      console.log('[Google OAuth] No user in context, returning not connected');
      return c.json({
        success: true,
        connected: false,
        message: 'User not authenticated',
      });
    }

    let result: any = null;

    // Look up by user_id first (if available)
    if (user.id) {
      try {
        result = await c.env.DB.prepare(`
          SELECT user_id, email, calendar_integration
          FROM pa_ai_users
          WHERE user_id = ?
        `).bind(user.id).first();

        console.log('[Google OAuth] Lookup by user_id result:', {
          found: !!result,
          dbUserId: result?.user_id,
          dbEmail: result?.email,
        });
      } catch (e) {
        console.error('[Google OAuth] Lookup by user_id failed:', e);
      }
    }

    // If not found by user_id, try by email
    if (!result && user.email) {
      try {
        result = await c.env.DB.prepare(`
          SELECT user_id, email, calendar_integration
          FROM pa_ai_users
          WHERE email = ?
        `).bind(user.email).first();
        
        console.log('[Google OAuth] Lookup by email result:', {
          found: !!result,
          dbUserId: result?.user_id,
          dbEmail: result?.email,
        });
      } catch (e) {
        console.error('[Google OAuth] Lookup by email failed:', e);
      }
    }

    console.log('[Google OAuth] Final auth status:', {
      userId: user.id,
      email: user.email,
      hasResult: !!result,
      hasIntegration: !!(result?.calendar_integration),
      integrationPreview: result?.calendar_integration ? 
        String(result.calendar_integration).substring(0, 50) + '...' : 'null',
    });

    if (!result || !result.calendar_integration) {
      return c.json({
        success: true,
        connected: false,
        message: 'Google Calendar is not connected',
      });
    }

    try {
      const integration = JSON.parse(result.calendar_integration as string);
      
      // Check if it's a Google integration
      if (integration.provider !== 'google' || !integration.refreshToken) {
        return c.json({
          success: true,
          connected: false,
          message: 'Google Calendar is not connected',
        });
      }

      return c.json({
        success: true,
        connected: true,
        connectedAt: integration.connectedAt,
        message: 'Google Calendar is connected',
      });
    } catch {
      return c.json({
        success: true,
        connected: false,
        message: 'Google Calendar is not connected',
      });
    }
  } catch (error: any) {
    console.error('[Google OAuth] Status check error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to check auth status',
    }, 500);
  }
}

/**
 * Disconnect Google Calendar
 * DELETE /api/google/auth/disconnect
 * 
 * Remove Google Calendar integration for user
 */
export async function disconnect(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string };

    await c.env.DB.prepare(`
      UPDATE pa_ai_users
      SET calendar_integration = NULL, updated_at = ?
      WHERE user_id = ?
    `).bind(new Date().toISOString(), user.id).run();

    console.log('[Google OAuth] Disconnected Google Calendar for user:', user.id);

    return c.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error: any) {
    console.error('[Google OAuth] Disconnect error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to disconnect Google Calendar',
    }, 500);
  }
}

/**
 * Get user's Google Calendar refresh token from database
 * Utility function for use by other controllers
 * 
 * @param db - D1 database instance
 * @param userIdOrEmail - User ID or email to look up
 */
export async function getUserRefreshToken(db: any, userIdOrEmail: string): Promise<string | null> {
  try {
    // Try to find by user_id first, then by email
    // This handles both legacy user IDs and Firebase UIDs
    let result = await db.prepare(`
      SELECT calendar_integration
      FROM pa_ai_users
      WHERE user_id = ?
    `).bind(userIdOrEmail).first();

    // If not found by user_id, try by email (for Firebase auth users)
    if (!result && userIdOrEmail.includes('@')) {
      result = await db.prepare(`
        SELECT calendar_integration
        FROM pa_ai_users
        WHERE email = ?
      `).bind(userIdOrEmail).first();
    }

    if (!result || !result.calendar_integration) {
      console.log('[Google OAuth] No calendar integration found for:', userIdOrEmail);
      return null;
    }

    const integration = JSON.parse(result.calendar_integration as string);
    
    if (integration.provider !== 'google' || !integration.refreshToken) {
      console.log('[Google OAuth] Calendar integration exists but no refresh token');
      return null;
    }

    console.log('[Google OAuth] Found refresh token for user');
    return integration.refreshToken;
  } catch (error) {
    console.error('[Google OAuth] Error getting user refresh token:', error);
    return null;
  }
}

/**
 * Handle Google Sign-In from mobile app
 * POST /api/google/auth/login
 * 
 * Creates or updates user account with Google credentials
 * Stores refresh token for Calendar/Gmail access
 */
export async function googleLogin(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { firebaseUid, email, name, photoUrl, googleRefreshToken, googleAccessToken } = body;

    if (!firebaseUid || !email) {
      return c.json({
        success: false,
        error: 'Firebase UID and email are required',
      }, 400);
    }

    console.log('[Google OAuth] Login request:', {
      firebaseUid,
      email,
      hasRefreshToken: !!googleRefreshToken,
    });

    // Check if user exists
    let user = await c.env.DB.prepare(`
      SELECT user_id, email, name, phone_number, profile_photo_url,
             timezone, currency, locale, status, calendar_integration, created_at
      FROM pa_ai_users
      WHERE email = ?
    `).bind(email).first();

    const now = new Date().toISOString();
    
    // Prepare calendar integration data
    const calendarIntegration = googleRefreshToken ? JSON.stringify({
      provider: 'google',
      refreshToken: googleRefreshToken,
      scopes: 'calendar gmail',
      connectedAt: now,
    }) : null;

    if (user) {
      // Update existing user with Google info
      console.log('[Google OAuth] Updating existing user:', user.user_id);
      
      const updates: any = {
        updated_at: now,
        last_active_at: now,
      };
      
      // Update profile photo if not set
      if (photoUrl && !user.profile_photo_url) {
        updates.profile_photo_url = photoUrl;
      }
      
      // Update calendar integration if we have a refresh token
      if (calendarIntegration) {
        updates.calendar_integration = calendarIntegration;
      }

      await c.env.DB.prepare(`
        UPDATE pa_ai_users
        SET updated_at = ?, last_active_at = ?, 
            profile_photo_url = COALESCE(?, profile_photo_url),
            calendar_integration = COALESCE(?, calendar_integration)
        WHERE user_id = ?
      `).bind(
        updates.updated_at,
        updates.last_active_at,
        updates.profile_photo_url || null,
        updates.calendar_integration || null,
        user.user_id
      ).run();
    } else {
      // Create new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[Google OAuth] Creating new user:', userId);
      
      // Generate a random password hash for Google users (they won't use it)
      const randomPassword = Math.random().toString(36).slice(-16) + 'Aa1!';
      const passwordHash = await hashPassword(randomPassword);

      await c.env.DB.prepare(`
        INSERT INTO pa_ai_users (
          user_id, email, password_hash, name, profile_photo_url,
          timezone, currency, locale, calendar_integration,
          created_at, updated_at, last_active_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        email,
        passwordHash,
        name || email.split('@')[0],
        photoUrl || null,
        'Australia/Sydney',
        'AUD',
        'en-AU',
        calendarIntegration,
        now,
        now,
        now,
        'active'
      ).run();

      user = {
        user_id: userId,
        email,
        name: name || email.split('@')[0],
        profile_photo_url: photoUrl,
        timezone: 'Australia/Sydney',
        currency: 'AUD',
        locale: 'en-AU',
        calendar_integration: calendarIntegration,
        created_at: now,
        status: 'active',
      };
    }

    // Generate JWT token
    const jwtSecret = (c.env.JWT_SECRET && c.env.JWT_SECRET.length > 0) 
      ? c.env.JWT_SECRET 
      : 'dartmouth-jwt-secret-change-in-production';
    
    const token = await generateJWT(
      { id: user.user_id as string, email: user.email as string, role: 'user' },
      jwtSecret
    );

    console.log('[Google OAuth] Login successful for:', email);

    return c.json({
      success: true,
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        profilePhotoUrl: user.profile_photo_url,
        timezone: user.timezone,
        currency: user.currency,
        locale: user.locale,
        calendarConnected: !!calendarIntegration,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Google OAuth] Login error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to process Google login',
    }, 500);
  }
}

/**
 * Hash password using Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate JWT token
 */
async function generateJWT(payload: { id: string; email: string; role: string }, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (7 * 24 * 60 * 60), // 7 days
  };

  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '');
  const base64Payload = btoa(JSON.stringify(fullPayload)).replace(/=/g, '');
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}
