import { Context } from 'hono';
import { Env } from '../types/shared';
import { uploadAttachmentToR2 } from '../utils/r2-upload';
import { parseTagsFromText, formatTagsForStorage } from '../utils/tag-parser';

// ============================================================================
// STAFF MEMOS CONTROLLER
// Personal notes for staff members with attachment support
// ============================================================================

/**
 * GET /api/memos
 * Get all memos for the current user
 */
export async function getMemos(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get query parameters for search
    const searchQuery = c.req.query('search') || '';
    const tagFilter = c.req.query('tag') || '';

    let query = `
      SELECT * FROM staff_memos
      WHERE staff_id = ? AND is_deleted = 0
    `;
    const params: any[] = [user.id];

    // Add tag filter
    if (tagFilter) {
      query += ` AND tags LIKE ?`;
      params.push(`%${tagFilter}%`);
    }

    // Add text search
    if (searchQuery) {
      query += ` AND content LIKE ?`;
      params.push(`%${searchQuery}%`);
    }

    query += ` ORDER BY created_at ASC`;

    const memos = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ memos: memos.results || [] });
  } catch (error) {
    console.error('[Memos] Error fetching memos:', error);
    return c.json({ error: 'Failed to fetch memos' }, 500);
  }
}

/**
 * POST /api/memos
 * Create a new memo
 */
export async function createMemo(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content, attachment, tags } = await c.req.json();
    console.log('[Memos] Received request:', { content: content?.substring(0, 50), hasAttachment: !!attachment, tags, attachmentKeys: attachment ? Object.keys(attachment) : [] });

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Memo content is required' }, 400);
    }

    // Parse tags from content using @tag {keyword} syntax
    const { tags: parsedTags, cleanedText } = parseTagsFromText(content);
    const finalContent = cleanedText || content; // Use cleaned text if tags were found
    const finalTags = parsedTags.length > 0 ? formatTagsForStorage(parsedTags) : (tags || null);

    const memoId = `memo-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    let attachmentSize = null;

    // Handle attachment if provided
    if (attachment && attachment.data && attachment.name) {
      try {
        const uploadResult = await uploadAttachmentToR2(
          c.env.ATTACHMENTS,
          {
            name: attachment.name,
            content: attachment.data,
            type: attachment.type,
            size: attachment.size,
          },
          `memos/${user.id}`
        );
        attachmentUrl = uploadResult.url;
        attachmentName = attachment.name;
        attachmentType = attachment.type;
        attachmentSize = attachment.size;
      } catch (uploadError) {
        console.error('[Memos] Error uploading attachment:', uploadError);
        return c.json({ error: 'Failed to upload attachment' }, 500);
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO staff_memos (
        id, staff_id, content, attachment_url, attachment_name, 
        attachment_type, attachment_size, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memoId,
      user.id,
      finalContent.trim(),
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize,
      finalTags,
      now,
      now
    ).run();

    const memo = await c.env.DB.prepare(`
      SELECT * FROM staff_memos WHERE id = ?
    `).bind(memoId).first();

    return c.json({ memo }, 201);
  } catch (error) {
    console.error('[Memos] Error creating memo:', error);
    return c.json({ error: 'Failed to create memo' }, 500);
  }
}

/**
 * PATCH /api/memos/:id
 * Edit a memo
 */
export async function editMemo(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const memoId = c.req.param('id');
    const { content, deleteAttachment } = await c.req.json();

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Memo content is required' }, 400);
    }

    // Check if memo exists and belongs to user
    const memo: any = await c.env.DB.prepare(`
      SELECT * FROM staff_memos WHERE id = ? AND staff_id = ? AND is_deleted = 0
    `).bind(memoId, user.id).first();

    if (!memo) {
      return c.json({ error: 'Memo not found' }, 404);
    }

    const now = new Date().toISOString();

    if (deleteAttachment) {
      await c.env.DB.prepare(`
        UPDATE staff_memos 
        SET content = ?, edited_at = ?, updated_at = ?,
            attachment_url = NULL, attachment_name = NULL, 
            attachment_type = NULL, attachment_size = NULL
        WHERE id = ?
      `).bind(content.trim(), now, now, memoId).run();
    } else {
      await c.env.DB.prepare(`
        UPDATE staff_memos 
        SET content = ?, edited_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(content.trim(), now, now, memoId).run();
    }

    const updatedMemo = await c.env.DB.prepare(`
      SELECT * FROM staff_memos WHERE id = ?
    `).bind(memoId).first();

    return c.json({ memo: updatedMemo });
  } catch (error) {
    console.error('[Memos] Error editing memo:', error);
    return c.json({ error: 'Failed to edit memo' }, 500);
  }
}

/**
 * DELETE /api/memos/:id
 * Delete a memo (soft delete)
 */
export async function deleteMemo(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const memoId = c.req.param('id');

    // Check if memo exists and belongs to user
    const memo: any = await c.env.DB.prepare(`
      SELECT * FROM staff_memos WHERE id = ? AND staff_id = ? AND is_deleted = 0
    `).bind(memoId, user.id).first();

    if (!memo) {
      return c.json({ error: 'Memo not found' }, 404);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE staff_memos 
      SET is_deleted = 1, deleted_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, memoId).run();

    return c.json({ success: true, message: 'Memo deleted' });
  } catch (error) {
    console.error('[Memos] Error deleting memo:', error);
    return c.json({ error: 'Failed to delete memo' }, 500);
  }
}

/**
 * GET /api/tags
 * Get all tags with counts (from memos and group chat)
 */
export async function getAllTags(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get tags from memos (user's own)
    const memoTags = await c.env.DB.prepare(`
      SELECT tags FROM staff_memos
      WHERE staff_id = ? AND is_deleted = 0 AND tags IS NOT NULL AND tags != ''
    `).bind(user.id).all();

    // Get tags from group chat messages (user has access to)
    const groupChatTags = await c.env.DB.prepare(`
      SELECT gcm.tags FROM group_chat_messages gcm
      JOIN group_chat_members gcm2 ON gcm.channel_id = gcm2.channel_id
      WHERE gcm2.staff_id = ? AND gcm.is_deleted = 0 AND gcm.tags IS NOT NULL AND gcm.tags != ''
    `).bind(user.id).all();

    // Parse and count tags
    const tagCounts: Record<string, number> = {};
    
    const processTagsString = (tagsString: string) => {
      // Split by comma and trim
      const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    };

    memoTags.results?.forEach((row: any) => {
      if (row.tags) processTagsString(row.tags);
    });

    groupChatTags.results?.forEach((row: any) => {
      if (row.tags) processTagsString(row.tags);
    });

    // Convert to array and sort by count (descending)
    const tagsArray = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count
    })).sort((a, b) => b.count - a.count);

    return c.json({ tags: tagsArray });
  } catch (error) {
    console.error('[Tags] Error fetching tags:', error);
    return c.json({ error: 'Failed to fetch tags' }, 500);
  }
}

