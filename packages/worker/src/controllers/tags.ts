/**
 * Tags Controller
 * Aggregates tags from all sources: Group Chat, Memos, Tickets, Internal Notes, Chat Messages
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import type { AuthUser } from '../middleware/auth';

/**
 * GET /api/tags
 * Get all unique tags with counts across all sources
 */
export async function getAllTags(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const searchQuery = c.req.query('search') || '';

    // Aggregate tags from all sources
    const tagCounts = new Map<string, number>();

    // 1. Group Chat messages
    const groupChatTags = await c.env.DB.prepare(`
      SELECT tags FROM group_chat_messages WHERE tags IS NOT NULL
    `).all();

    for (const row of groupChatTags.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // 2. Staff Memos
    const memoTags = await c.env.DB.prepare(`
      SELECT tags FROM staff_memos WHERE tags IS NOT NULL AND staff_id = ?
    `).bind(user.id).all();

    for (const row of memoTags.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // 3. Tickets
    const ticketTags = await c.env.DB.prepare(`
      SELECT tags FROM tickets WHERE tags IS NOT NULL
    `).all();

    for (const row of ticketTags.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // 4. Internal Notes (Staff Notes)
    const noteTags = await c.env.DB.prepare(`
      SELECT tags FROM internal_notes WHERE tags IS NOT NULL AND (is_deleted IS NULL OR is_deleted = 0)
    `).all();

    for (const row of noteTags.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // 5. Chat Messages (Live Chat)
    const chatTags = await c.env.DB.prepare(`
      SELECT tags FROM chat_messages WHERE tags IS NOT NULL
    `).all();

    for (const row of chatTags.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // Convert to array and filter by search query
    // Filter out empty or whitespace-only tag names
    let tagsArray = Array.from(tagCounts.entries())
      .filter(([name]) => name && name.trim().length > 0)
      .map(([name, count]) => ({
        name: name.trim(),
        count,
      }));

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      tagsArray = tagsArray.filter(tag => tag.name.toLowerCase().includes(lowerQuery));
    }

    // Sort by count (descending), then by name (ascending)
    tagsArray.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });

    console.log('[Tags] getAllTags - Returning tags:', tagsArray.map(t => `"${t.name}" (${t.count})`));

    return c.json({
      tags: tagsArray,
      total: tagsArray.length,
    });
  } catch (error) {
    console.error('[Tags] Get all tags error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * GET /api/tags/search
 * Search for content by tag across all sources
 */
export async function searchTags(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as AuthUser;
    const searchQuery = c.req.query('search') || '';

    if (!searchQuery) {
      return c.json({ results: [] });
    }

    const results: any[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    // Search Group Chat messages
    const groupChatResults = await c.env.DB.prepare(`
      SELECT 
        gcm.id,
        gcm.content,
        gcm.tags,
        gcm.created_at,
        gcm.channel_id,
        gc.name as channel_name,
        s.first_name,
        s.last_name,
        'group_chat' as source_type
      FROM group_chat_messages gcm
      JOIN group_chat_channels gc ON gcm.channel_id = gc.id
      JOIN staff_users s ON gcm.sender_id = s.id
      WHERE gcm.tags IS NOT NULL
    `).all();

    for (const row of groupChatResults.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim().toLowerCase());
      if (tags.some(tag => tag.includes(lowerQuery))) {
        results.push({
          id: row.id,
          content: row.content,
          tags: row.tags,
          created_at: row.created_at,
          source_type: 'group_chat',
          channel_name: row.channel_name,
          channel_id: row.channel_id,
          author: `${row.first_name} ${row.last_name}`,
        });
      }
    }

    // Search Staff Memos (only user's own memos)
    const memoResults = await c.env.DB.prepare(`
      SELECT 
        id,
        content,
        tags,
        created_at,
        'memo' as source_type
      FROM staff_memos
      WHERE staff_id = ? AND tags IS NOT NULL
    `).bind(user.id).all();

    for (const row of memoResults.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim().toLowerCase());
      if (tags.some(tag => tag.includes(lowerQuery))) {
        results.push({
          id: row.id,
          content: row.content,
          tags: row.tags,
          created_at: row.created_at,
          source_type: 'memo',
        });
      }
    }

    // Search Tickets
    const ticketResults = await c.env.DB.prepare(`
      SELECT 
        ticket_id,
        ticket_number,
        subject,
        tags,
        created_at,
        customer_name,
        'ticket' as source_type
      FROM tickets
      WHERE tags IS NOT NULL
    `).all();

    for (const row of ticketResults.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim().toLowerCase());
      if (tags.some(tag => tag.includes(lowerQuery))) {
        results.push({
          id: row.ticket_id,
          ticket_number: row.ticket_number,
          subject: row.subject,
          tags: row.tags,
          created_at: row.created_at,
          customer_name: row.customer_name,
          source_type: 'ticket',
        });
      }
    }

    // Search Internal Notes
    const noteResults = await c.env.DB.prepare(`
      SELECT 
        n.id,
        n.content,
        n.tags,
        n.created_at,
        n.ticket_id,
        t.ticket_number,
        t.subject as ticket_subject,
        s.first_name,
        s.last_name,
        'staff_note' as source_type
      FROM internal_notes n
      JOIN tickets t ON n.ticket_id = t.ticket_id
      JOIN staff_users s ON n.staff_id = s.id
      WHERE n.tags IS NOT NULL AND (n.is_deleted IS NULL OR n.is_deleted = 0)
    `).all();

    for (const row of noteResults.results) {
      const tags = (row.tags as string).split(',').map(t => t.trim().toLowerCase());
      if (tags.some(tag => tag.includes(lowerQuery))) {
        results.push({
          id: row.id,
          content: row.content,
          tags: row.tags,
          created_at: row.created_at,
          source_type: 'staff_note',
          ticket_id: row.ticket_id,
          ticket_number: row.ticket_number,
          ticket_subject: row.ticket_subject,
          author: `${row.first_name} ${row.last_name}`,
        });
      }
    }

    // Sort by created_at (newest first)
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({
      results,
      total: results.length,
      query: searchQuery,
    });
  } catch (error) {
    console.error('[Tags] Search tags error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

