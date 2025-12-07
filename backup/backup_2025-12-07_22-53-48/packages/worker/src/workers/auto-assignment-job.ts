/**
 * Auto-Assignment Cron Job
 * 
 * Runs every 5 minutes to auto-assign tickets to available staff
 */

import { AutoAssignmentService } from '../services/AutoAssignmentService';
import type { Env } from '../types/shared';

export async function runAutoAssignment(env: Env): Promise<void> {
  console.log('[AutoAssignment] Starting cron job...');
  
  try {
    const service = new AutoAssignmentService(env.DB);
    const result = await service.runAutoAssignment();
    
    if (result.assigned > 0) {
      console.log(`[AutoAssignment] ✅ Assigned ${result.assigned} tickets`);
      result.results.forEach(r => {
        console.log(`  - ${r.ticketNumber} → ${r.staffName} (${r.reason})`);
      });
    } else {
      console.log('[AutoAssignment] No tickets assigned');
    }
  } catch (error) {
    console.error('[AutoAssignment] Error in cron job:', error);
  }
}

