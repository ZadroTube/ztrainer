import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { format, subDays, differenceInCalendarDays, parseISO } from 'date-fns';
// используем crypto.randomUUID() вместо uuid пакета
import { TabName, BaseExercise, WorkoutExercise, PlannedWorkoutsDict, CompletedSetsDict, UserStats } from '../types';
import { supabase, authViaTelegram } from '../lib/supabase';

export interface RestContext {
  type: 'set' | 'exercise';
  workoutId: string;
  setIndex?: number;
}

interface UserProfile {
  first_name?: string;
  username?: string;
  photo_url?: string;
}

interface AppContextType {
  loading: boolean;
  isTelegram: boolean;
  userProfile: UserProfile | null;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: 'plan' | 'diary';
  setViewMode: (mode: 'plan' | 'diary') => void;
  exerciseDb: BaseExercise[];
  addExerciseToDb: (exercise: Omit<BaseExercise, 'id'>) => void;
  updateExerciseInDb: (id: string, exercise: Omit<BaseExercise, 'id'>) => void;
  deleteExerciseFromDb: (id: string) => void;
  plannedWorkouts: PlannedWorkoutsDict;
  addExerciseToPlan: (dateStr: string, exercise: BaseExercise, sets: number, reps: number, restTimeSeconds?: number) => void;
  removeExerciseFromPlan: (dateStr: string, workoutId: string) => void;
  completedSets: CompletedSetsDict;
  toggleSetCompletion: (dateStr: string, workoutId: string, setIndex: number, isCompleted: boolean) => void;
  workoutStartTime: number | null;
  workoutAccumulatedMs: number;
  isWorkoutPaused: boolean;
  startWorkoutTimer: () => void;
  pauseWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;
  finishWorkout: () => void;
  restTimerEnd: number | null;
  restTimerDuration: number;
  restContext: RestContext | null;
  isRestPaused: boolean;
  restRemainingAtPause: number;
  startRestTimer: (durationSeconds: number, context: RestContext) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  clearRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  dailyDurations: Record<string, number>;
  userStats: UserStats;
  resetUserStats: () => void;
  actualExerciseRests: Record<string, number>;
  loadError: string | null;
}

const defaultExercises: BaseExercise[] = [
  { id: '1', name: 'Жим лежа', targetMuscleGroup: 'Грудь', defaultSets: 3, defaultReps: 10, defaultRestTimeSeconds: 90 },
  { id: '2', name: 'Приседания со штангой', targetMuscleGroup: 'Ноги', defaultSets: 3, defaultReps: 12, defaultRestTimeSeconds: 120 },
  { id: '3', name: 'Подтягивания', targetMuscleGroup: 'Спина', defaultSets: 3, defaultReps: 8, defaultRestTimeSeconds: 90 },
];

const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const mockPlanned: PlannedWorkoutsDict = {
  [yesterdayStr]: [
    { id: '1', name: 'Жим лежа', targetMuscleGroup: 'Грудь', workoutId: 'w1', sets: 3, reps: 10, restTimeSeconds: 90 },
    { id: '2', name: 'Приседания со штангой', targetMuscleGroup: 'Ноги', workoutId: 'w2', sets: 3, reps: 12, restTimeSeconds: 120 },
  ]
};
const mockSets: CompletedSetsDict = {
  [`${yesterdayStr}_w1_0`]: true, [`${yesterdayStr}_w1_1`]: true, [`${yesterdayStr}_w1_2`]: true,
  [`${yesterdayStr}_w2_0`]: true, [`${yesterdayStr}_w2_1`]: true, [`${yesterdayStr}_w2_2`]: true,
};
const mockDurations = { [yesterdayStr]: 45 * 60 };

const AppContext = createContext<AppContextType | undefined>(undefined);

function supaSafe<T>(promise: PromiseLike<T>, label: string) {
  Promise.resolve(promise).catch((e: unknown) => console.error(`Supabase ${label} error:`, e));
}

declare global {
  interface Window { Telegram?: { WebApp?: { initData?: string } } }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabName>('fitness');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'plan' | 'diary'>('plan');

  const [exerciseDb, setExerciseDb] = useState<BaseExercise[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkoutsDict>({});
  const [completedSets, setCompletedSets] = useState<CompletedSetsDict>({});
  const [dailyDurations, setDailyDurations] = useState<Record<string, number>>({});
  const [actualExerciseRests, setActualExerciseRests] = useState<Record<string, number>>({});

  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [workoutAccumulatedMs, setWorkoutAccumulatedMs] = useState<number>(0);
  const [isWorkoutPaused, setIsWorkoutPaused] = useState<boolean>(false);

  const [restTimerEnd, setRestTimerEnd] = useState<number | null>(null);
  const [restTimerDuration, setRestTimerDuration] = useState<number>(0);
  const [restContext, setRestContext] = useState<RestContext | null>(null);
  const [isRestPaused, setIsRestPaused] = useState<boolean>(false);
  const [restRemainingAtPause, setRestRemainingAtPause] = useState<number>(0);
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [restPausedAt, setRestPausedAt] = useState<number | null>(null);
  const [restAccumulatedPause, setRestAccumulatedPause] = useState<number>(0);

  const [userStats, setUserStats] = useState<UserStats>({
    totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0, achievements: {},
  });

  const initDev = useCallback(() => {
    setExerciseDb(defaultExercises);
    setPlannedWorkouts(mockPlanned);
    setCompletedSets(mockSets);
    setDailyDurations(mockDurations);
    setLoading(false);
  }, []);

  const loadFromSupabase = useCallback(async () => {
    try {
      const [
        { data: exercises },
        { data: wp },
        { data: cs },
        { data: ws },
        { data: er },
        { data: ua },
      ] = await Promise.all([
        supabase.from('exercises').select('*').order('created_at'),
        supabase.from('workout_plans').select('*').order('sort_order'),
        supabase.from('completed_sets').select('*'),
        supabase.from('workout_sessions').select('plan_date, duration_seconds'),
        supabase.from('exercise_rests').select('*'),
        supabase.from('user_achievements').select('*'),
      ]);

      setExerciseDb((exercises ?? []).map((r: any) => ({
        id: r.id, name: r.name,
        targetMuscleGroup: r.target_muscle_group,
        defaultSets: r.default_sets, defaultReps: r.default_reps,
        defaultRestTimeSeconds: r.default_rest_time_seconds,
        defaultWeightKg: r.default_weight_kg != null ? Number(r.default_weight_kg) : undefined,
      })));

      const plans: PlannedWorkoutsDict = {};
      for (const r of (wp ?? []) as any[]) {
        if (!plans[r.plan_date]) plans[r.plan_date] = [];
        plans[r.plan_date].push({
          id: r.exercise_id ?? '', name: r.name,
          targetMuscleGroup: r.target_muscle_group,
          defaultSets: undefined, defaultReps: undefined, defaultRestTimeSeconds: undefined, defaultWeightKg: undefined,
          workoutId: r.id, sets: r.sets, reps: r.reps, restTimeSeconds: r.rest_time_seconds,
          weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
        });
      }
      setPlannedWorkouts(plans);

      const sets: CompletedSetsDict = {};
      for (const r of (cs ?? []) as any[]) {
        sets[`${r.plan_date}_${r.workout_plan_id}_${r.set_index}`] = true;
      }
      setCompletedSets(sets);

      const durations: Record<string, number> = {};
      for (const r of (ws ?? []) as any[]) {
        durations[r.plan_date] = (durations[r.plan_date] ?? 0) + r.duration_seconds;
      }
      setDailyDurations(durations);

      const rests: Record<string, number> = {};
      for (const r of (er ?? []) as any[]) {
        const d = format(new Date(r.recorded_at), 'yyyy-MM-dd');
        rests[`${d}_${r.workout_plan_id}`] = (rests[`${d}_${r.workout_plan_id}`] ?? 0) + r.actual_rest_seconds;
      }
      setActualExerciseRests(rests);

      const ach: Record<string, number> = {};
      for (const r of (ua ?? []) as any[]) { ach[r.achievement_type] = new Date(r.unlocked_at).getTime(); }
      setUserStats(prev => ({ ...prev, achievements: ach }));

      setLoading(false);
    } catch (err) {
      console.error('Failed to load from Supabase:', err);
      setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (window.Telegram?.WebApp?.initData) {
        const result = await authViaTelegram(window.Telegram.WebApp.initData);
        if (result) {
          setIsTelegram(true);
          setUserProfile({ first_name: result.first_name, username: result.username, photo_url: result.photo_url });
          setLoadError(null);
          await loadFromSupabase();
          return;
        }
        // В Telegram WebView, но авторизация не прошла — показываем ошибку
        setIsTelegram(true);
        setLoadError('Ошибка авторизации через Telegram. Попробуйте перезапустить Mini App.');
        setLoading(false);
        return;
      }
      initDev();
    })();
  }, [loadFromSupabase, initDev]);

  useEffect(() => {
    let totalSeconds = 0;
    for (const d of Object.values(dailyDurations)) totalSeconds += d as number;
    const totalSetsCompleted = Object.values(completedSets).filter(v => v).length;
    if (!totalSetsCompleted && !totalSeconds) {
      setUserStats(prev => ({ ...prev, totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0 }));
      return;
    }
    const activeDates = [...new Set(Object.keys(completedSets).map(k => k.split('_')[0]))].sort((a,b) => b.localeCompare(a));
    let streak = 0, cd = new Date();
    for (const ds of activeDates) {
      const diff = differenceInCalendarDays(cd, parseISO(ds));
      if (diff <= 1) { streak++; cd = parseISO(ds); } else break;
    }
    const achievements = { ...userStats.achievements };
    const now = Date.now();
    if (totalSetsCompleted > 0 && !achievements['first_workout']) achievements['first_workout'] = now;
    if (streak >= 3 && !achievements['streak_3']) achievements['streak_3'] = now;
    if (streak >= 7 && !achievements['streak_7']) achievements['streak_7'] = now;
    if (totalSeconds >= 5*3600 && !achievements['time_5h']) achievements['time_5h'] = now;
    if (totalSetsCompleted >= 100 && !achievements['volume_100']) achievements['volume_100'] = now;
    setUserStats({ totalWorkoutSeconds: totalSeconds, totalSets: totalSetsCompleted, currentStreak: Math.max(streak, 1), achievements });

    if (isTelegram) {
      const newAchs = Object.entries(achievements).filter(([k]) => !userStats.achievements[k]);
      for (const [type, time] of newAchs) {
        supaSafe(supabase.from('user_achievements').upsert({ achievement_type: type, unlocked_at: new Date(time as number).toISOString() }, { onConflict: 'user_id, achievement_type' }), `achievement ${type}`);
      }
    }
  }, [completedSets, dailyDurations, userStats.achievements, isTelegram]);

  // --- Timer logic (unchanged) ---
  const startWorkoutTimer = () => {
    if (isWorkoutPaused) { setWorkoutStartTime(Date.now()); setIsWorkoutPaused(false); }
    else if (!workoutStartTime) { setWorkoutStartTime(Date.now()); setWorkoutAccumulatedMs(0); setIsWorkoutPaused(false); }
  };
  const pauseWorkoutTimer = () => {
    if (workoutStartTime && !isWorkoutPaused) {
      setWorkoutAccumulatedMs(prev => prev + (Date.now() - workoutStartTime));
      setWorkoutStartTime(null); setIsWorkoutPaused(true);
    }
  };
  const resetWorkoutTimer = () => { setWorkoutStartTime(null); setWorkoutAccumulatedMs(0); setIsWorkoutPaused(false); };

  const recordRest = () => {
    if (restContext?.type === 'exercise' && restStartTime) {
      let p = restAccumulatedPause;
      if (isRestPaused && restPausedAt) p += Date.now() - restPausedAt;
      const elapsed = Math.floor((Date.now() - restStartTime - p) / 1000);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const rk = `${dateStr}_${restContext.workoutId}`;
      setActualExerciseRests(prev => ({ ...prev, [rk]: (prev[rk] ?? 0) + elapsed }));
      if (isTelegram) supaSafe(supabase.from('exercise_rests').insert({ workout_plan_id: restContext.workoutId, actual_rest_seconds: elapsed }), 'exercise_rests insert');
    }
  };

  const startRestTimer = (durationSeconds: number, context: RestContext) => {
    recordRest();
    setRestTimerDuration(durationSeconds);
    setRestTimerEnd(Date.now() + durationSeconds * 1000);
    setRestContext(context);
    setIsRestPaused(false);
    setRestStartTime(Date.now()); setRestPausedAt(null); setRestAccumulatedPause(0);
  };
  const pauseRestTimer = () => {
    if (restTimerEnd && !isRestPaused) { setRestRemainingAtPause(restTimerEnd - Date.now()); setIsRestPaused(true); setRestPausedAt(Date.now()); }
  };
  const resumeRestTimer = () => {
    if (isRestPaused && restContext) {
      setRestTimerEnd(Date.now() + restRemainingAtPause); setIsRestPaused(false);
      if (restPausedAt) { setRestAccumulatedPause(prev => prev + (Date.now() - restPausedAt)); setRestPausedAt(null); }
    }
  };
  const clearRestTimer = () => {
    recordRest();
    setRestTimerEnd(null); setRestTimerDuration(0); setRestContext(null); setIsRestPaused(false);
    setRestStartTime(null); setRestPausedAt(null); setRestAccumulatedPause(0);
  };
  const adjustRestTimer = (deltaSeconds: number) => {
    const dm = deltaSeconds * 1000;
    if (isRestPaused) {
      let nr = restRemainingAtPause + dm; if (nr < 0) nr = 0;
      setRestRemainingAtPause(nr); setRestTimerDuration(prev => Math.max(prev, nr / 1000));
    } else if (restTimerEnd) {
      let ne = restTimerEnd + dm; if (ne < Date.now()) ne = Date.now();
      setRestTimerEnd(ne); setRestTimerDuration(prev => Math.max(prev, (ne - Date.now()) / 1000));
    }
  };

  // --- CRUD with Supabase sync ---
  const addExerciseToDb = (ex: Omit<BaseExercise, 'id'>) => {
    const n = { ...ex, id: crypto.randomUUID() };
    setExerciseDb(prev => [...prev, n]);
    if (isTelegram) supaSafe(supabase.from('exercises').insert({ id: n.id, name: n.name, target_muscle_group: n.targetMuscleGroup ?? null, default_sets: n.defaultSets ?? 3, default_reps: n.defaultReps ?? 10, default_rest_time_seconds: n.defaultRestTimeSeconds ?? 90, default_weight_kg: n.defaultWeightKg ?? null }), 'exercises insert');
  };
  const updateExerciseInDb = (id: string, ex: Omit<BaseExercise, 'id'>) => {
    setExerciseDb(prev => prev.map(e => e.id === id ? { ...ex, id } : e));
    if (isTelegram) supaSafe(supabase.from('exercises').update({ name: ex.name, target_muscle_group: ex.targetMuscleGroup ?? null, default_sets: ex.defaultSets ?? 3, default_reps: ex.defaultReps ?? 10, default_rest_time_seconds: ex.defaultRestTimeSeconds ?? 90, default_weight_kg: ex.defaultWeightKg ?? null }).eq('id', id), 'exercises update');
  };
  const deleteExerciseFromDb = (id: string) => { setExerciseDb(prev => prev.filter(e => e.id !== id)); if (isTelegram) supaSafe(supabase.from('exercises').delete().eq('id', id), 'exercises delete'); };

  const addExerciseToPlan = (dateStr: string, exercise: BaseExercise, sets: number, reps: number, rt?: number) => {
    const wid = crypto.randomUUID();
    setPlannedWorkouts(prev => {
      const today = prev[dateStr] ?? [];
      const newSortOrder = today.length;
      const weightKg = exercise.defaultWeightKg;
      const newItem = { ...exercise, workoutId: wid, sets, reps, restTimeSeconds: rt, weightKg };
      if (isTelegram) supaSafe(supabase.from('workout_plans').insert({ id: wid, plan_date: dateStr, exercise_id: exercise.id, name: exercise.name, target_muscle_group: exercise.targetMuscleGroup ?? null, sets, reps, rest_time_seconds: rt ?? null, weight_kg: weightKg ?? null, sort_order: newSortOrder }), 'workout_plans insert');
      return { ...prev, [dateStr]: [...today, newItem] };
    });
  };

  const removeExerciseFromPlan = (dateStr: string, wid: string) => {
    setPlannedWorkouts(prev => ({ ...prev, [dateStr]: (prev[dateStr] ?? []).filter(e => e.workoutId !== wid) }));
    setCompletedSets(prev => { const n = { ...prev }; for (const k of Object.keys(n)) { if (k.includes(wid)) delete n[k]; } return n; });
    if (isTelegram) { supaSafe(supabase.from('workout_plans').delete().eq('id', wid), 'workout_plans delete'); supaSafe(supabase.from('completed_sets').delete().eq('workout_plan_id', wid), 'completed_sets delete'); }
  };

  const toggleSetCompletion = (dateStr: string, wid: string, si: number, done: boolean) => {
    if (done && !workoutStartTime && !workoutAccumulatedMs) startWorkoutTimer();
    setCompletedSets(prev => {
      const key = `${dateStr}_${wid}_${si}`;
      if (!done) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: true };
    });
    if (isTelegram) {
      if (done) supaSafe(supabase.from('completed_sets').upsert({ workout_plan_id: wid, plan_date: dateStr, set_index: si }, { onConflict: 'user_id, workout_plan_id, set_index' }), 'completed_sets upsert');
      else supaSafe(supabase.from('completed_sets').delete().eq('workout_plan_id', wid).eq('set_index', si), 'completed_sets delete');
    }
  };

  const finishWorkout = () => {
    const elapsedMs = workoutAccumulatedMs + (workoutStartTime && !isWorkoutPaused ? Date.now() - workoutStartTime : 0);
    const secs = Math.floor(elapsedMs / 1000);
    if (secs > 0) {
      const ds = format(selectedDate, 'yyyy-MM-dd');
      setDailyDurations(prev => ({ ...prev, [ds]: (prev[ds] ?? 0) + secs }));
      if (isTelegram) supaSafe(supabase.from('workout_sessions').insert({ plan_date: ds, duration_seconds: secs }), 'workout_sessions insert');
    }
    resetWorkoutTimer(); clearRestTimer();
  };

  const resetUserStats = () => {
    setDailyDurations({}); setCompletedSets({}); setActualExerciseRests({}); setPlannedWorkouts({});
    setUserStats({ totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0, achievements: {} });
    if (isTelegram) {
      supaSafe(supabase.from('workout_sessions').delete(), 'reset workout_sessions');
      supaSafe(supabase.from('completed_sets').delete(), 'reset completed_sets');
      supaSafe(supabase.from('exercise_rests').delete(), 'reset exercise_rests');
      supaSafe(supabase.from('workout_plans').delete(), 'reset workout_plans');
      supaSafe(supabase.from('user_achievements').delete(), 'reset user_achievements');
    }
  };

  return (
    <AppContext.Provider value={{
      loading, isTelegram, userProfile,
      activeTab, setActiveTab,
      selectedDate, setSelectedDate,
      viewMode, setViewMode,
      exerciseDb, addExerciseToDb, updateExerciseInDb, deleteExerciseFromDb,
      plannedWorkouts, addExerciseToPlan, removeExerciseFromPlan,
      completedSets, toggleSetCompletion,
      workoutStartTime, workoutAccumulatedMs, isWorkoutPaused,
      startWorkoutTimer, pauseWorkoutTimer, resetWorkoutTimer, finishWorkout,
      restTimerEnd, restTimerDuration, restContext, isRestPaused, restRemainingAtPause,
      startRestTimer, pauseRestTimer, resumeRestTimer, clearRestTimer, adjustRestTimer,
      dailyDurations, userStats, resetUserStats, actualExerciseRests, loadError
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}