import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================================
// Аутентификация через Telegram Mini App
// =============================================================

export async function authViaTelegram(initData: string) {
  const { data, error } = await supabase.functions.invoke<{
    access_token?: string;
    refresh_token?: string;
    profile_id: string;
    telegram_id: number;
    first_name?: string;
    username?: string;
  }>("telegram-auth", {
    body: { initData },
  });

  if (error || !data?.access_token || !data?.refresh_token) return null;

  // После setSession() все запросы автоматически фильтруются RLS по auth.uid().
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return data;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// =============================================================
// CRUD-хелперы (RLS-совместимые)
// После setSession() user_id подставляется автоматически через RLS
// =============================================================

// ---- Упражнения ----
export async function fetchExercises() {
  const { data } = await supabase.from("exercises").select("*").order("created_at");
  return data ?? [];
}

export async function createExercise(exercise: {
  name: string;
  target_muscle_group?: string;
  default_sets?: number;
  default_reps?: number;
  default_rest_time_seconds?: number;
}) {
  return supabase.from("exercises").insert(exercise).select().single();
}

export async function updateExercise(
  id: string,
  exercise: {
    name: string;
    target_muscle_group?: string;
    default_sets?: number;
    default_reps?: number;
    default_rest_time_seconds?: number;
  }
) {
  return supabase.from("exercises").update(exercise).eq("id", id).select().single();
}

export async function deleteExercise(id: string) {
  return supabase.from("exercises").delete().eq("id", id);
}

// ---- План тренировок на дату ----
export async function fetchWorkoutPlan(planDate: string) {
  const { data } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("plan_date", planDate)
    .order("sort_order");
  return data ?? [];
}

export async function addExerciseToPlan(planDate: string, item: {
  exercise_id?: string;
  name: string;
  target_muscle_group?: string;
  sets: number;
  reps: number;
  rest_time_seconds?: number;
  sort_order?: number;
}) {
  return supabase.from("workout_plans").insert({ plan_date: planDate, ...item }).select().single();
}

export async function removeExerciseFromPlan(workoutPlanId: string) {
  return supabase.from("workout_plans").delete().eq("id", workoutPlanId);
}

// ---- Выполненные подходы ----
export async function fetchCompletedSets(planDate: string) {
  const { data } = await supabase
    .from("completed_sets")
    .select("*")
    .eq("plan_date", planDate);
  return data ?? [];
}

export async function toggleSet(
  workoutPlanId: string,
  planDate: string,
  setIndex: number,
  completed: boolean
) {
  if (completed) {
    return supabase.from("completed_sets").upsert(
      { workout_plan_id: workoutPlanId, plan_date: planDate, set_index: setIndex },
      { onConflict: "user_id, workout_plan_id, set_index" }
    );
  } else {
    return supabase
      .from("completed_sets")
      .delete()
      .eq("workout_plan_id", workoutPlanId)
      .eq("set_index", setIndex);
  }
}

// ---- Сессии тренировок ----
export async function fetchSessionDurations(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("workout_sessions")
    .select("plan_date, duration_seconds");
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.plan_date] = (result[row.plan_date] ?? 0) + row.duration_seconds;
  }
  return result;
}

export async function fetchUserStats(): Promise<{
  total_workout_seconds: number;
  total_sets: number;
}> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("duration_seconds");
  const { count } = await supabase
    .from("completed_sets")
    .select("*", { count: "exact", head: true });

  const totalSeconds = (sessions ?? []).reduce((sum, s) => sum + s.duration_seconds, 0);
  return {
    total_workout_seconds: totalSeconds,
    total_sets: count ?? 0,
  };
}

export async function saveSession(planDate: string, durationSeconds: number) {
  return supabase
    .from("workout_sessions")
    .insert({ plan_date: planDate, duration_seconds: durationSeconds });
}

// ---- Отдых между упражнениями ----
export async function saveExerciseRest(workoutPlanId: string, actualRestSeconds: number) {
  return supabase
    .from("exercise_rests")
    .insert({ workout_plan_id: workoutPlanId, actual_rest_seconds: actualRestSeconds });
}

// ---- Достижения ----
export async function fetchAchievements(): Promise<Record<string, number>> {
  const { data } = await supabase.from("user_achievements").select("*");
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.achievement_type] = new Date(row.unlocked_at).getTime();
  }
  return result;
}

export async function unlockAchievement(achievementType: string) {
  return supabase
    .from("user_achievements")
    .upsert({ achievement_type: achievementType }, { onConflict: "user_id, achievement_type" });
}
