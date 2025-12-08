/**
 * Integrations Controller
 * 
 * API endpoints for managing third-party integrations
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import { ShopifyIntegration } from '../services/ShopifyIntegration';

/**
 * Get all integrations status
 * GET /api/integrations
 */
export async function getIntegrations(c: Context<{ Bindings: Env }>) {
  try {
    const env = c.env;

    // Check Shopify (check KV first, then secrets)
    const shopifyDomain = await env.APP_CONFIG.get('SHOPIFY_DOMAIN') || env.SHOPIFY_DOMAIN;
    const shopifyToken = await env.APP_CONFIG.get('SHOPIFY_ACCESS_TOKEN') || env.SHOPIFY_ACCESS_TOKEN;
    const shopifyConnected = !!(shopifyDomain && shopifyToken);
    
    // Check R2
    const r2Connected = !!env.ATTACHMENTS;
    
    // Check Email (Gmail) - check both secrets and KV
    const gmailClientId = env.GMAIL_CLIENT_ID || await env.APP_CONFIG.get('GMAIL_CLIENT_ID');
    const gmailClientSecret = env.GMAIL_CLIENT_SECRET || await env.APP_CONFIG.get('GMAIL_CLIENT_SECRET');
    const gmailRefreshToken = env.GMAIL_REFRESH_TOKEN || await env.APP_CONFIG.get('GMAIL_REFRESH_TOKEN');
    const emailConnected = !!(gmailClientId && gmailClientSecret && gmailRefreshToken);
    
    // Check Resend - check both secrets and KV
    const resendApiKey = env.RESEND_API_KEY || await env.APP_CONFIG.get('RESEND_API_KEY');
    const resendConnected = !!resendApiKey;

    return c.json({
      shopify: {
        connected: shopifyConnected,
        domain: shopifyDomain ? maskSecret(shopifyDomain) : '',
        accessToken: shopifyToken ? '••••••••' : '',
      },
      r2: {
        connected: r2Connected,
        bucketName: 'dartmouth-attachments',
      },
      email: {
        connected: emailConnected,
        clientId: gmailClientId ? maskSecret(gmailClientId) : '',
        clientSecret: gmailClientSecret ? '••••••••' : '',
        refreshToken: gmailRefreshToken ? '••••••••' : '',
      },
      resend: {
        connected: resendConnected,
        apiKey: resendApiKey ? '••••••••' : '',
      },
    });
  } catch (error) {
    console.error('[Integrations] Error fetching integrations:', error);
    return c.json({ error: 'Failed to fetch integrations' }, 500);
  }
}

/**
 * Test integration connection
 * POST /api/integrations/:id/test
 */
export async function testIntegration(c: Context<{ Bindings: Env }>) {
  try {
    const integrationId = c.req.param('id');
    const env = c.env;

    switch (integrationId) {
      case 'shopify': {
        // Check KV first (user-configured), then fall back to Secrets
        const shopifyDomain = await env.APP_CONFIG.get('SHOPIFY_DOMAIN') || env.SHOPIFY_DOMAIN;
        const shopifyToken = await env.APP_CONFIG.get('SHOPIFY_ACCESS_TOKEN') || env.SHOPIFY_ACCESS_TOKEN;

        if (!shopifyDomain || !shopifyToken) {
          return c.json({ success: false, message: 'Shopify credentials not configured' }, 400);
        }

        try {
          console.log('[Shopify Test] Testing connection with domain:', shopifyDomain);
          console.log('[Shopify Test] Token starts with:', shopifyToken.substring(0, 10) + '...');
          
          const shopify = new ShopifyIntegration(shopifyDomain, shopifyToken);
          // Test by fetching shop info
          const response = await fetch(`https://${shopifyDomain}/admin/api/2024-01/shop.json`, {
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
          });

          console.log('[Shopify Test] Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[Shopify Test] ✅ Connection successful');
            return c.json({ 
              success: true, 
              message: `Connected to ${data.shop?.name || 'Shopify store'}`,
              data: {
                shopName: data.shop?.name,
                domain: data.shop?.domain,
              }
            });
          } else {
            const errorText = await response.text();
            console.error('[Shopify Test] ❌ API error:', response.status, errorText);
            
            let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`;
            
            if (response.status === 403) {
              errorMessage = '403 Forbidden - Check that your custom app is installed and has the correct API scopes (read_customers, read_orders, read_products)';
            } else if (response.status === 401) {
              errorMessage = '401 Unauthorized - Invalid access token. Make sure you copied the Admin API access token correctly.';
            }
            
            return c.json({ 
              success: false, 
              message: errorMessage,
              details: errorText
            }, 400);
          }
        } catch (error) {
          console.error('[Shopify Test] Exception:', error);
          return c.json({ 
            success: false, 
            message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, 500);
        }
      }

      case 'cloudflare-r2': {
        if (!env.ATTACHMENTS) {
          return c.json({ success: false, message: 'R2 bucket not configured' }, 400);
        }

        try {
          // Test by listing objects (limit 1)
          const list = await env.ATTACHMENTS.list({ limit: 1 });
          return c.json({ 
            success: true, 
            message: 'R2 bucket connected successfully',
            data: {
              objectCount: list.objects.length,
            }
          });
        } catch (error) {
          return c.json({ 
            success: false, 
            message: `R2 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, 500);
        }
      }

      case 'email': {
        if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
          return c.json({ success: false, message: 'Gmail credentials not configured' }, 400);
        }

        // For Gmail, we can't easily test without making a real API call
        // Just verify the credentials exist
        return c.json({ 
          success: true, 
          message: 'Gmail credentials configured (test email sending to verify)',
        });
      }

      case 'resend': {
        if (!env.RESEND_API_KEY) {
          return c.json({ success: false, message: 'Resend API key not configured' }, 400);
        }

        try {
          // Test by fetching API key info
          const response = await fetch('https://api.resend.com/api-keys', {
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
          });

          if (response.ok) {
            return c.json({ 
              success: true, 
              message: 'Resend API key is valid',
            });
          } else {
            return c.json({ 
              success: false, 
              message: `Resend API error: ${response.status} ${response.statusText}` 
            }, 400);
          }
        } catch (error) {
          return c.json({ 
            success: false, 
            message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, 500);
        }
      }

      default:
        return c.json({ error: 'Unknown integration' }, 400);
    }
  } catch (error) {
    console.error('[Integrations] Error testing integration:', error);
    return c.json({ error: 'Failed to test integration' }, 500);
  }
}

/**
 * Save integration settings
 * POST /api/integrations/:id/settings
 */
export async function saveIntegrationSettings(c: Context<{ Bindings: Env }>) {
  try {
    const integrationId = c.req.param('id');
    const settings = await c.req.json();
    const env = c.env;

    switch (integrationId) {
      case 'shopify': {
        const { domain, accessToken } = settings;

        if (!domain || !accessToken) {
          return c.json({ 
            success: false, 
            message: 'Both domain and access token are required' 
          }, 400);
        }

        // Validate domain format
        if (!domain.includes('.myshopify.com')) {
          return c.json({ 
            success: false, 
            message: 'Domain must be in format: your-store.myshopify.com' 
          }, 400);
        }

        // Validate access token format
        if (!accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_')) {
          return c.json({ 
            success: false, 
            message: 'Access token must start with shpat_ or shpca_' 
          }, 400);
        }

        // Store in KV (encrypted storage)
        await env.APP_CONFIG.put('SHOPIFY_DOMAIN', domain);
        await env.APP_CONFIG.put('SHOPIFY_ACCESS_TOKEN', accessToken);

        console.log('[Integrations] Shopify settings saved to KV');

        return c.json({
          success: true,
          message: 'Shopify settings saved successfully!',
        });
      }

      case 'email': {
        const { clientId, clientSecret, refreshToken } = settings;

        if (!clientId || !clientSecret || !refreshToken) {
          return c.json({ 
            success: false, 
            message: 'All Gmail credentials are required' 
          }, 400);
        }

        await env.APP_CONFIG.put('GMAIL_CLIENT_ID', clientId);
        await env.APP_CONFIG.put('GMAIL_CLIENT_SECRET', clientSecret);
        await env.APP_CONFIG.put('GMAIL_REFRESH_TOKEN', refreshToken);

        return c.json({
          success: true,
          message: 'Gmail settings saved successfully!',
        });
      }

      case 'resend': {
        const { apiKey } = settings;

        if (!apiKey) {
          return c.json({ 
            success: false, 
            message: 'Resend API key is required' 
          }, 400);
        }

        if (!apiKey.startsWith('re_')) {
          return c.json({ 
            success: false, 
            message: 'Invalid Resend API key format' 
          }, 400);
        }

        await env.APP_CONFIG.put('RESEND_API_KEY', apiKey);

        return c.json({
          success: true,
          message: 'Resend settings saved successfully!',
        });
      }

      default:
        return c.json({ 
          success: false, 
          message: 'Unknown integration' 
        }, 400);
    }
  } catch (error) {
    console.error('[Integrations] Error saving settings:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to save settings' 
    }, 500);
  }
}

/**
 * Debug: Check what's in KV storage
 * GET /api/integrations/debug
 */
export async function debugIntegrations(c: Context<{ Bindings: Env }>) {
  try {
    const env = c.env;
    
    const shopifyDomain = await env.APP_CONFIG.get('SHOPIFY_DOMAIN');
    const shopifyToken = await env.APP_CONFIG.get('SHOPIFY_ACCESS_TOKEN');
    
    return c.json({
      kv: {
        SHOPIFY_DOMAIN: shopifyDomain ? maskSecret(shopifyDomain) : 'not set',
        SHOPIFY_ACCESS_TOKEN: shopifyToken ? maskSecret(shopifyToken) : 'not set',
      },
      secrets: {
        SHOPIFY_DOMAIN: env.SHOPIFY_DOMAIN ? maskSecret(env.SHOPIFY_DOMAIN) : 'not set',
        SHOPIFY_ACCESS_TOKEN: env.SHOPIFY_ACCESS_TOKEN ? maskSecret(env.SHOPIFY_ACCESS_TOKEN) : 'not set',
      },
    });
  } catch (error) {
    console.error('[Integrations] Debug error:', error);
    return c.json({ error: 'Failed to debug' }, 500);
  }
}

/**
 * Helper function to mask secrets (show first/last few chars)
 */
function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
}

