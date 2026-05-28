import Dexie, { type Table } from 'dexie';

export interface LocalExercise {
  id: string;
  name: string;
  target_muscle_group: string | null;
  default_sets: number;
  default_reps: number;
  default_rest_time_seconds: number;
  default_weight_kg?: number | null;
  is_time_based?: boolean | null;
  archived_at?: string | null;
}

export interface LocalWorkoutPlan {
  id: string;
  exercise_id: string | null;
  plan_date: string;
  name: string;
  target_muscle_group: string | null;
  sets: number;
  reps: number;
  rest_time_seconds: number | null;
  duration_seconds?: number | null;
  weight_kg: number | null;
  sort_order: number;
}

export interface LocalCompletedSet {
  id: string; // E.g. `${workout_plan_id}_${set_index}`
  workout_plan_id: string;
  plan_date: string;
  set_index: number;
}

export interface LocalWorkoutSession {
  id: string;
  plan_date: string;
  duration_seconds: number;
  rating?: number | null;
  notes?: string | null;
}

export interface LocalExerciseRest {
  id: string;
  workout_plan_id: string;
  actual_rest_seconds: number;
  recorded_at: string;
}

export interface LocalBodyMetric {
  id: string;
  date: string;
  weight_kg: number | null;
  chest_cm: number | null;
  bicep_r_cm: number | null;
  bicep_l_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  thigh_r_cm: number | null;
  thigh_l_cm: number | null;
  notes: string | null;
}

export interface LocalUserAchievement {
  id: string;
  achievement_type: string;
  unlocked_at: string;
}

export interface SyncQueueItem {
  id?: number; // Auto-increment PK
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  table_name: string;
  payload: any;
  created_at: number;
}

class ZTrainerDB extends Dexie {
  exercises!: Table<LocalExercise, string>;
  workout_plans!: Table<LocalWorkoutPlan, string>;
  completed_sets!: Table<LocalCompletedSet, string>;
  workout_sessions!: Table<LocalWorkoutSession, string>;
  exercise_rests!: Table<LocalExerciseRest, string>;
  body_metrics!: Table<LocalBodyMetric, string>;
  user_achievements!: Table<LocalUserAchievement, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('ZTrainerDB');
    this.version(1).stores({
      exercises: 'id, name, target_muscle_group, archived_at',
      workout_plans: 'id, plan_date, sort_order',
      completed_sets: 'id, workout_plan_id, plan_date',
      workout_sessions: 'id, plan_date',
      exercise_rests: 'id, workout_plan_id, recorded_at',
      body_metrics: 'id, date',
      user_achievements: 'id, achievement_type',
      sync_queue: '++id, table_name, created_at',
    });
  }
}

export const db = new ZTrainerDB();
