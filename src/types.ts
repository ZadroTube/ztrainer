export type TabName = 'home' | 'fitness' | 'cinema' | 'profile';

export interface BaseExercise {
  id: string;
  name: string;
  targetMuscleGroup?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultRestTimeSeconds?: number;
  defaultWeightKg?: number; // undefined = без веса (подтягивания, бег и т.д.)
  isTimeBased?: boolean; // упражнение на время (планка, велосипед)
}

export interface WorkoutExercise extends BaseExercise {
  workoutId: string; // unique instance in a day (since we can add same exercise twice)
  sets?: number;
  reps?: number;
  durationSeconds?: number; // Для упражнений на время
  restTimeSeconds?: number;
  weightKg?: number; // undefined = без веса
}

// Key is `${dateStr}_${workoutId}_${setIndex}`
export type CompletedSetsDict = Record<string, boolean>;

// Map of date (YYYY-MM-DD) to list of exercises
export type PlannedWorkoutsDict = Record<string, WorkoutExercise[]>;

export interface UserStats {
  totalWorkoutSeconds: number;
  totalSets: number;
  currentStreak: number;
  achievements: Record<string, number>; // achievementId -> unlockedAt timestamp
}

export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'endurance' | 'general_fitness';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingLocation = 'gym' | 'outdoor' | 'home' | 'combined';

export interface BodyMetric {
  id?: string;
  user_id?: string;
  date: string;
  weight_kg?: number | null;
  chest_cm?: number | null;
  bicep_r_cm?: number | null;
  bicep_l_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  thigh_r_cm?: number | null;
  thigh_l_cm?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface WorkoutSession {
  id: string;
  user_id?: string;
  plan_date: string;
  duration_seconds: number;
  rating?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface CoachMessage {
  id: string;
  sender: 'user' | 'coach';
  message: string;
  created_at: string;
}

export interface AdaptationChange {
  workout_plan_id: string;
  exercise_name: string;
  old_values: { sets: number; reps: number; weight_kg?: number };
  new_values: { sets: number; reps: number; weight_kg?: number };
}

export interface CoachAdaptation {
  id: string;
  status: 'pending' | 'applied' | 'dismissed';
  explanation: string;
  suggested_changes: AdaptationChange[];
  created_at: string;
}



