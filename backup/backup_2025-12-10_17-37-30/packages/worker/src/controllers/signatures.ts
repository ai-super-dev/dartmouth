import { Context } from 'hono';
import { Env } from '../types';
import { nanoid } from 'nanoid';

interface SignatureSettings {
  logoUrl: string;
  companyName: string;
  email: string;
  website: string;
}

/**
 * GET /api/signatures/global
 * Get the global email signature template
 */
export async function getGlobalSignature(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get from KV storage, default template
    const signatureHtml = await c.env.APP_CONFIG?.get('email_signature_template');
    const defaultSignature = `
<br><br>
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
  <tr>
    <td style="padding-right: 20px; vertical-align: top; border-right: 2px solid #0066cc;">
      <img src="https://amazingtransfers.com/cdn/shop/files/Amazing_Transfers_Logo_120x.png" alt="Amazing Transfers" style="display: block; width: 120px; height: auto;" />
    </td>
    <td style="padding-left: 20px; vertical-align: top;">
      <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #0066cc;">{{STAFF_NAME}}</p>
      <p style="margin: 0 0 3px 0; font-size: 14px; color: #666;">Customer Support Specialist</p>
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #333;">Amazing Transfers</p>
      <p style="margin: 0 0 3px 0; font-size: 13px; color: #666;">
        <span style="color: #0066cc;">📧</span> <a href="mailto:support@amazingtransfers.com" style="color: #0066cc; text-decoration: none;">support@amazingtransfers.com</a>
      </p>
      <p style="margin: 0 0 3px 0; font-size: 13px; color: #666;">
        <span style="color: #0066cc;">🌐</span> <a href="https://amazingtransfers.com" style="color: #0066cc; text-decoration: none;">amazingtransfers.com</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999; font-style: italic;">
        We're here to help! Quality DTF Transfers for Your Business
      </p>
    </td>
  </tr>
</table>
    `.trim();

    return c.json({ 
      signatureHtml: signatureHtml || defaultSignature 
    });
  } catch (error) {
    console.error('[Signatures] Error getting global signature:', error);
    return c.json({ error: 'Failed to get signature' }, 500);
  }
}

/**
 * PUT /api/signatures/global
 * Set the global email signature template (admin only)
 */
export async function setGlobalSignature(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Only admins can change this setting
    if (user.role !== 'admin') {
      return c.json({ error: 'Only admins can change this setting' }, 403);
    }

    const { signatureHtml } = await c.req.json();

    if (!signatureHtml || typeof signatureHtml !== 'string') {
      return c.json({ error: 'Invalid signature HTML' }, 400);
    }

    // Store in KV
    await c.env.APP_CONFIG?.put('email_signature_template', signatureHtml);

    return c.json({ success: true, signatureHtml });
  } catch (error) {
    console.error('[Signatures] Error setting global signature:', error);
    return c.json({ error: 'Failed to set signature' }, 500);
  }
}

/**
 * GET /api/signatures/preview
 * Get the signature with staff name injected (for preview)
 */
export async function getSignaturePreview(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Fetch staff details including job_title and department
    const staffResult = await c.env.DB.prepare(
      'SELECT first_name, last_name, job_title, department FROM staff_users WHERE id = ?'
    ).bind(user.id).first();

    const staffName = staffResult 
      ? `${staffResult.first_name} ${staffResult.last_name}`
      : 'Staff Member';
    
    const staffJobTitle = staffResult?.job_title || staffResult?.department || 'Customer Support Specialist';

    // Get global company settings
    const settingsJson = await c.env.APP_CONFIG?.get('signature_settings');
    const settings: SignatureSettings = settingsJson 
      ? JSON.parse(settingsJson)
      : {
          logoUrl: '',
          companyName: 'Amazing Transfers',
          email: 'info@amazingtransfers.com.au',
          website: 'amazingtransfers.com',
        };

    const signatureHtml = generateSignatureHtml(settings, staffName, staffJobTitle);

    return c.json({ signatureHtml });
  } catch (error) {
    console.error('[Signatures] Error getting signature preview:', error);
    return c.json({ error: 'Failed to get signature preview' }, 500);
  }
}

/**
 * Helper function to convert HTML to plain text
 */
function htmlToPlainText(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Add line breaks for better formatting
  text = text.replace(/\s+(Customer Support|Amazing Transfers|support@|amazingtransfers\.com|We're here)/g, '\n$1');
  
  return text;
}

/**
 * GET /api/signatures/plain-text
 * Get the signature in plain text format for textarea (with staff name injected)
 * Dynamically converts the HTML signature to plain text
 */
export async function getSignaturePlainText(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Fetch staff details from database to get name
    const staffResult = await c.env.DB.prepare(
      'SELECT first_name, last_name FROM staff_users WHERE id = ?'
    ).bind(user.id).first();

    const staffName = staffResult 
      ? `${staffResult.first_name} ${staffResult.last_name}`
      : 'Staff Member';

    // Get the HTML signature template
    const signatureHtml = await c.env.APP_CONFIG?.get('email_signature_template');
    
    const defaultSignature = `
<br><br>
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
  <tr>
    <td style="padding-right: 20px; vertical-align: top; border-right: 2px solid #0066cc;">
      <img src="https://amazingtransfers.com/cdn/shop/files/Amazing_Transfers_Logo_120x.png" alt="Amazing Transfers" style="display: block; width: 120px; height: auto;" />
    </td>
    <td style="padding-left: 20px; vertical-align: top;">
      <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #0066cc;">{{STAFF_NAME}}</p>
      <p style="margin: 0 0 3px 0; font-size: 14px; color: #666;">Customer Support Specialist</p>
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #333;">Amazing Transfers</p>
      <p style="margin: 0 0 3px 0; font-size: 13px; color: #666;">
        <span style="color: #0066cc;">📧</span> <a href="mailto:support@amazingtransfers.com" style="color: #0066cc; text-decoration: none;">support@amazingtransfers.com</a>
      </p>
      <p style="margin: 0 0 3px 0; font-size: 13px; color: #666;">
        <span style="color: #0066cc;">🌐</span> <a href="https://amazingtransfers.com" style="color: #0066cc; text-decoration: none;">amazingtransfers.com</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999; font-style: italic;">
        We're here to help! Quality DTF Transfers for Your Business
      </p>
    </td>
  </tr>
</table>
    `.trim();

    const template = signatureHtml || defaultSignature;
    
    // Inject staff name into HTML
    const htmlWithName = template.replace(/\{\{STAFF_NAME\}\}/g, staffName);
    
    // Convert HTML to plain text
    const plainText = htmlToPlainText(htmlWithName);
    
    // Format nicely for textarea
    const plainTextSignature = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${plainText}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return c.json({ signaturePlainText: plainTextSignature });
  } catch (error) {
    console.error('[Signatures] Error getting plain text signature:', error);
    return c.json({ error: 'Failed to get plain text signature' }, 500);
  }
}

/**
 * POST /api/signatures/upload-logo
 * Upload a logo to R2 for use in email signatures
 */
export async function uploadLogo(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { attachment } = await c.req.json();

    if (!attachment || !attachment.data || !attachment.name) {
      return c.json({ error: 'Invalid attachment data' }, 400);
    }

    // Extract base64 data
    const base64Data = attachment.data.split(',')[1] || attachment.data;
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const fileExtension = attachment.name.split('.').pop() || 'png';
    const uniqueKey = `signatures/logo-${nanoid()}.${fileExtension}`;

    // Upload to R2
    await c.env.ATTACHMENTS.put(uniqueKey, buffer, {
      httpMetadata: {
        contentType: attachment.type,
      },
    });

    // Construct public URL
    const logoUrl = `https://dartmouth-os-worker.dartmouth.workers.dev/api/attachments/${uniqueKey}`;

    return c.json({ 
      success: true, 
      logoUrl,
      message: 'Logo uploaded successfully'
    });
  } catch (error) {
    console.error('[Signatures] Error uploading logo:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
}

/**
 * Helper function to generate HTML signature from settings + staff profile
 */
function generateSignatureHtml(settings: SignatureSettings, staffName: string, staffJobTitle: string): string {
  const { logoUrl, companyName, email, website } = settings;
  
  return `
<br>
<p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  Regards,<br>
  <strong>${staffName}</strong><br>
  ${staffJobTitle}<br>
  ${companyName}<br>
  <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a><br>
  <a href="https://${website}" style="color: #0066cc; text-decoration: none;">${website}</a>
</p>
${logoUrl ? `<p style="margin: 10px 0 0 0;"><img src="${logoUrl}" alt="${companyName}" style="display: block; width: 120px; height: auto;" /></p>` : ''}
  `.trim();
}

/**
 * GET /api/signatures/settings
 * Get signature settings (form fields)
 */
export async function getSettings(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settingsJson = await c.env.APP_CONFIG?.get('signature_settings');
    const settings: SignatureSettings = settingsJson 
      ? JSON.parse(settingsJson)
      : {
          logoUrl: '',
          companyName: 'Amazing Transfers',
          email: 'info@amazingtransfers.com.au',
          website: 'amazingtransfers.com',
        };

    return c.json(settings);
  } catch (error) {
    console.error('[Signatures] Error getting settings:', error);
    return c.json({ error: 'Failed to get settings' }, 500);
  }
}

/**
 * PUT /api/signatures/settings
 * Save signature settings
 */
export async function saveSettings(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const settings: SignatureSettings = await c.req.json();

    // Validate required fields
    if (!settings.companyName || !settings.email) {
      return c.json({ error: 'Company name and email are required' }, 400);
    }

    // Normalize empty strings
    const normalizedSettings = {
      logoUrl: settings.logoUrl || '',
      companyName: settings.companyName,
      email: settings.email,
      website: settings.website || '',
    };

    // Save to KV
    await c.env.APP_CONFIG?.put('signature_settings', JSON.stringify(normalizedSettings));

    return c.json({ success: true, settings: normalizedSettings });
  } catch (error) {
    console.error('[Signatures] Error saving settings:', error);
    return c.json({ error: 'Failed to save settings' }, 500);
  }
}

/**
 * POST /api/signatures/preview-from-settings
 * Generate preview from settings
 */
export async function getPreviewFromSettings(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings: SignatureSettings = await c.req.json();

    // Fetch staff details including job_title and department
    const staffResult = await c.env.DB.prepare(
      'SELECT first_name, last_name, job_title, department FROM staff_users WHERE id = ?'
    ).bind(user.id).first();

    const staffName = staffResult 
      ? `${staffResult.first_name} ${staffResult.last_name}`
      : 'Staff Member';
    
    const staffJobTitle = staffResult?.job_title || staffResult?.department || 'Customer Support Specialist';

    const signatureHtml = generateSignatureHtml(settings, staffName, staffJobTitle);

    return c.json({ signatureHtml });
  } catch (error) {
    console.error('[Signatures] Error generating preview:', error);
    return c.json({ error: 'Failed to generate preview' }, 500);
  }
}

