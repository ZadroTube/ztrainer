import { supabase } from '@/lib/supabase';
import { db } from './db';

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  isSyncing = true;

  try {
    const queue = await db.sync_queue.orderBy('id').toArray();
    for (const item of queue) {
      const { action, table_name, payload } = item;
      
      try {
        let query;
        if (action === 'INSERT') {
          query = supabase.from(table_name).insert(payload);
        } else if (action === 'UPDATE') {
          const { match, updates } = payload;
          query = supabase.from(table_name).update(updates).match(match);
        } else if (action === 'UPSERT') {
          const { values, options } = payload;
          query = supabase.from(table_name).upsert(values, options);
        } else if (action === 'DELETE') {
          query = supabase.from(table_name).delete().match(payload);
        }

        if (query) {
          const { error } = await query;
          if (error) {
            console.error(`Sync error for table ${table_name}:`, error);
            // Detect network issues vs validation/auth issues
            // PostgREST errors are object with code, message, etc.
            // If it's a connection failure (e.g. fetch fail), throw to abort queue
            if (
              error.message?.includes('fetch') ||
              error.message?.includes('Network') ||
              error.message?.includes('network') ||
              error.status === 0 || // standard code for fetch failure
              error.code === 'PGRST102' // network/timeout
            ) {
              throw new Error('Network error during sync');
            }
          }
        }
        
        // Remove from queue if successfully sent or if it failed with a database error
        // (so a bad payload won't block the sync queue forever)
        await db.sync_queue.delete(item.id!);
      } catch (err: any) {
        console.error('Failed to sync queue item, halting processing:', err);
        // Halting processing of queue to preserve chronological ordering
        break;
      }
    }
  } finally {
    isSyncing = false;
  }
}

// Register browser event listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}
