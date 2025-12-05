/**
 * R2 Upload Utility
 * Handles uploading attachments to Cloudflare R2 storage
 */

export interface AttachmentUpload {
  name: string;
  content: string; // base64 data URL
  type: string;
  size: number;
}

export interface UploadedAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Upload an attachment to R2 and return the public URL
 */
export async function uploadAttachmentToR2(
  r2: R2Bucket,
  attachment: AttachmentUpload,
  ticketId: string
): Promise<UploadedAttachment> {
  // Generate unique filename
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().split('-')[0];
  const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `attachments/${ticketId}/${timestamp}-${randomId}-${sanitizedName}`;

  // Convert base64 data URL to buffer
  let buffer: ArrayBuffer;
  if (attachment.content.startsWith('data:')) {
    // Remove data URL prefix (e.g., "data:image/png;base64,")
    const base64Data = attachment.content.split(',')[1] || attachment.content;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else {
    // Assume it's already base64 without prefix
    const binaryString = atob(attachment.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  }

  // Upload to R2
  await r2.put(key, buffer, {
    httpMetadata: {
      contentType: attachment.type,
    },
    customMetadata: {
      originalName: attachment.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Return public URL
  // Note: You'll need to set up a custom domain or use R2 public buckets
  // For now, we'll use the R2.dev subdomain (you need to enable this in dashboard)
  const publicUrl = `https://pub-XXXXX.r2.dev/${key}`;
  
  return {
    url: key, // Store the key, we'll construct URL when serving
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
  };
}

/**
 * Get public URL for an R2 object
 * This constructs the URL from the R2 key
 */
export function getR2PublicUrl(key: string, accountId: string): string {
  // Option 1: Use custom domain (recommended for production)
  // return `https://files.yourdomain.com/${key}`;
  
  // Option 2: Use R2.dev subdomain (needs to be enabled in dashboard)
  // return `https://pub-${accountId}.r2.dev/${key}`;
  
  // Option 3: Serve through worker (what we'll use for now)
  return `/api/attachments/${key}`;
}

