/**
 * Cross-device realtime sync for fitness tables.
 *
 * Supabase Realtime streams INSERT/UPDATE/DELETE events for these tables;
 * we relay them to subscribers as plain payloads. RLS scopes events to the
 * current user, so we never see anyone else's changes.
 *
 * Subscribers don't have to know about Supabase channels — they just call
 * `subscribeFitnessRealtime(handlers)` and get an unsubscribe function.
 *
 * Usage in AppContext:
 *   useEffect(() => {
 *     return subscribeFitnessRealtime({
 *       onExerciseChange: (event) => ...,
 *       onPlanChange: (event) => ...,
 *       onCompletedSetChange: (event) => ...,
 *     });
 *   }, []);
 */
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ExerciseRow {
  id: string;
  user_id: string;
  name: string;
  target_muscle_group: string | null;
  default_sets: number;
  default_reps: number;
  default_rest_time_seconds: number;
  default_weight_kg: number | null;
  archived_at: string | null;
}

export interface WorkoutPlanRow {
  id: string;
  user_id: string;
  exercise_id: string | null;
  plan_date: string;
  name: string;
  target_muscle_group: string | null;
  sets: number;
  reps: number;
  rest_time_seconds: number | null;
  weight_kg: number | null;
  sort_order: number;
}

export interface CompletedSetRow {
  id: string;
  user_id: string;
  workout_plan_id: string;
  plan_date: string;
  set_index: number;
  completed_at: string;
}

export interface RealtimeHandlers {
  onExerciseChange?: (payload: RealtimePostgresChangesPayload<ExerciseRow>) => void;
  onPlanChange?: (payload: RealtimePostgresChangesPayload<WorkoutPlanRow>) => void;
  onCompletedSetChange?: (payload: RealtimePostgresChangesPayload<CompletedSetRow>) => void;
}

/**
 * Subscribe to fitness-table changes. Returns an unsubscribe function.
 *
 * The Supabase channel name is unique per call to allow multiple subscribers
 * (e.g. StrictMode double-mount, two providers in tests) without conflicts.
 */
export function subscribeFitnessRealtime(handlers: RealtimeHandlers): () => void {
  const channelName = `fitness:${Math.random().toString(36).slice(2, 10)}`;
  const channel = supabase.channel(channelName);

  if (handlers.onExerciseChange) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'exercises' },
      (payload) => handlers.onExerciseChange?.(payload as RealtimePostgresChangesPayload<ExerciseRow>),
    );
  }
  if (handlers.onPlanChange) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workout_plans' },
      (payload) => handlers.onPlanChange?.(payload as RealtimePostgresChangesPayload<WorkoutPlanRow>),
    );
  }
  if (handlers.onCompletedSetChange) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'completed_sets' },
      (payload) => handlers.onCompletedSetChange?.(payload as RealtimePostgresChangesPayload<CompletedSetRow>),
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
