export type TabName = 'home' | 'fitness' | 'cinema' | 'profile';

export interface BaseExercise {
  id: string;
  name: string;
  targetMuscleGroup?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultRestTimeSeconds?: number;
  defaultWeightKg?: number; // undefined = без веса (подтягивания, бег и т.д.)
}

export interface WorkoutExercise extends BaseExercise {
  workoutId: string; // unique instance in a day (since we can add same exercise twice)
  sets: number;
  reps: number;
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
