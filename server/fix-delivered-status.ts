/**
 * One-time migration script to fix delivered requests with incorrect status
 * Run this script once to update all delivered requests to have status='completed'
 */

import { db } from './db';
import { dataRequests } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function fixDeliveredRequestsStatus() {
  console.log('Starting migration: Fixing delivered requests with incorrect status...');
  
  try {
    // Update all requests that have been delivered but don't have status='completed'
    const result = await db
      .update(dataRequests)
      .set({ 
        status: 'completed',
        updatedAt: new Date()
      })
      .where(sql`delivered_at IS NOT NULL AND status != 'completed'`)
      .returning({ id: dataRequests.id });
    
    console.log(`✓ Migration complete! Updated ${result.length} requests to 'completed' status.`);
    
    if (result.length > 0) {
      console.log('Updated request IDs:', result.map(r => r.id).join(', '));
    } else {
      console.log('No requests needed updating - all delivered requests already have correct status.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

fixDeliveredRequestsStatus();
