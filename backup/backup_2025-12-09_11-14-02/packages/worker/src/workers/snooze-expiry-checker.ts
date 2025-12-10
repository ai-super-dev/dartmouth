/**
 * Snooze Expiry Checker
 * Automatically unsnoozes tickets when their snooze time has elapsed
 * Runs on the scheduled cron job (every 5 minutes)
 */

import type { Env } from '../types/shared';

export async function checkSnoozeExpiry(env: Env): Promise<void> {
  console.log('[SnoozeChecker] Checking for expired snoozes at:', new Date().toISOString());
  
  try {
    const now = new Date().toISOString();
    
    // First check if snoozed_until column exists
    let hasSnoozedUntilColumn = false;
    try {
      await env.DB.prepare(`SELECT snoozed_until FROM tickets LIMIT 1`).first();
      hasSnoozedUntilColumn = true;
    } catch (e) {
      console.log('[SnoozeChecker] snoozed_until column not found - skipping check');
      return;
    }
    
    // Find all snoozed tickets where snoozed_until has passed
    const { results: snoozedTickets } = await env.DB.prepare(`
      SELECT ticket_id, ticket_number, snoozed_until
      FROM tickets
      WHERE status = 'snoozed'
        AND snoozed_until IS NOT NULL
        AND snoozed_until <= ?
    `).bind(now).all();

    if (!snoozedTickets || snoozedTickets.length === 0) {
      console.log('[SnoozeChecker] No expired snoozes found');
      return;
    }

    console.log(`[SnoozeChecker] Found ${snoozedTickets.length} expired snooze(s)`);

    for (const ticket of snoozedTickets as any[]) {
      try {
        // Unsnooze the ticket - set status back to 'open'
        await env.DB.prepare(`
          UPDATE tickets
          SET status = 'open',
              snoozed_until = NULL,
              updated_at = ?
          WHERE ticket_id = ?
        `).bind(now, ticket.ticket_id).run();

        // Add a system note about the auto-unsnooze
        const noteId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO internal_notes (id, ticket_id, staff_id, note_type, content, created_at, updated_at)
          VALUES (?, ?, 'system', 'general', ?, ?, ?)
        `).bind(
          noteId,
          ticket.ticket_id,
          `⏰ Ticket automatically unsnoozed - snooze time elapsed`,
          now,
          now
        ).run();

        console.log(`[SnoozeChecker] ✅ Unsnoozed ticket ${ticket.ticket_number}`);
      } catch (ticketError) {
        console.error(`[SnoozeChecker] Failed to unsnooze ticket ${ticket.ticket_number}:`, ticketError);
      }
    }

    console.log(`[SnoozeChecker] Completed - unsnoozed ${snoozedTickets.length} ticket(s)`);
  } catch (error) {
    console.error('[SnoozeChecker] Error checking snooze expiry:', error);
  }
}

