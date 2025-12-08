/**
 * Attachments Controller
 * Serves files from R2 storage
 */

import { Context } from 'hono';
import { Env } from '../types/shared';

/**
 * Serve attachment from R2
 * GET /api/attachments/:key
 */
export async function serveAttachment(c: Context<{ Bindings: Env }>) {
  try {
    const key = c.req.param('key');
    
    if (!key) {
      return c.json({ error: 'Attachment key required' }, 400);
    }

    // Get object from R2
    const object = await c.env.ATTACHMENTS.get(key);
    
    if (!object) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    // Get metadata
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    const originalName = object.customMetadata?.originalName || 'download';

    // Return file with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${originalName}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
      },
    });
  } catch (error) {
    console.error('[Attachments] Error serving attachment:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Serve attachment with wildcard path support
 * GET /api/attachments/*
 */
export async function serveAttachmentWildcard(c: Context<{ Bindings: Env }>) {
  try {
    // Get the full path after /api/attachments/
    const fullPath = c.req.path.replace('/api/attachments/', '');
    
    if (!fullPath) {
      return c.json({ error: 'Attachment path required' }, 400);
    }

    // Get object from R2
    const object = await c.env.ATTACHMENTS.get(fullPath);
    
    if (!object) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    // Get metadata
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    const originalName = object.customMetadata?.originalName || 'download';

    // Return file with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${originalName}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
      },
    });
  } catch (error) {
    console.error('[Attachments] Error serving attachment:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

