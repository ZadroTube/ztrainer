import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthResult {
  access_token?: string;
  refresh_token?: string;
  profile_id: string;
  telegram_id: number;
  first_name?: string;
  username?: string;
  photo_url?: string;
}

async function handleAuthResponse(data: AuthResult | null, error: unknown) {
  if (error || !data?.access_token || !data?.refresh_token) return null;

  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return data;
}

export async function authViaTelegram(initData: string) {
  const { data, error } = await supabase.functions.invoke<AuthResult>("telegram-auth", {
    body: { initData },
  });
  return handleAuthResponse(data, error);
}

export async function authViaTelegramWidget(authData: string) {
  const { data, error } = await supabase.functions.invoke<AuthResult>("telegram-auth", {
    body: { authData },
  });
  return handleAuthResponse(data, error);
}

export async function fetchExerciseHistory(exerciseId: string, limit = 10) {
  const todayStr = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from("workout_plans")
    .select("plan_date, weight_kg, sets, reps")
    .eq("exercise_id", exerciseId)
    .lte("plan_date", todayStr)
    .order("plan_date", { ascending: false })
    .limit(limit);
  return data ?? [];
}
