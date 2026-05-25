import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { format, subDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { TabName, BaseExercise, WorkoutExercise, PlannedWorkoutsDict, CompletedSetsDict, UserStats, FitnessGoal, FitnessLevel, TrainingLocation, BodyMetric, CoachMessage, CoachAdaptation } from '@/types';
import { supabase, authViaTelegram } from '@/lib/supabase';
import { subscribeFitnessRealtime } from '@/lib/realtime';
import { sendCoachMessage, fetchCoachAdaptation, applyCoachAdaptation, dismissCoachAdaptation } from '@/lib/botApi';

// Type-narrowing for supabase fluent builders that resolve to { data, error }.
type SupaResult = { data?: unknown; error?: { message?: string } | null };
function isSupaResult(x: unknown): x is SupaResult {
  return typeof x === 'object' && x !== null && 'error' in x;
}

export interface RestContext {
  type: 'set' | 'exercise';
  workoutId: string;
  setIndex?: number;
}

interface UserProfile {
  first_name?: string;
  username?: string;
  photo_url?: string;
  fitness_goal?: FitnessGoal;
  fitness_level?: FitnessLevel;
  available_minutes?: number;
  training_location?: TrainingLocation;
  equipment?: string;
  birth_year?: number;
  gender?: 'male' | 'female';
}

interface ExerciseRow {
  id: string; name: string; target_muscle_group: string | null;
  default_sets: number; default_reps: number; default_rest_time_seconds: number;
  default_weight_kg: number | null;
}

interface WorkoutPlanRow {
  id: string; exercise_id: string | null; name: string; target_muscle_group: string | null;
  plan_date: string; sets: number; reps: number; rest_time_seconds: number | null;
  weight_kg: number | null; sort_order: number;
}

interface CompletedSetRow {
  plan_date: string; workout_plan_id: string; set_index: number;
}

interface SessionRow {
  plan_date: string; duration_seconds: number;
}

interface ExerciseRestRow {
  workout_plan_id: string; actual_rest_seconds: number; recorded_at: string;
}

interface AchievementRow {
  achievement_type: string; unlocked_at: string;
}

const defaultExercises: Omit<BaseExercise, 'id'>[] = [
  { name: 'Жим лежа', targetMuscleGroup: 'Грудь', defaultSets: 3, defaultReps: 10, defaultRestTimeSeconds: 90 },
  { name: 'Приседания со штангой', targetMuscleGroup: 'Ноги', defaultSets: 3, defaultReps: 12, defaultRestTimeSeconds: 120 },
  { name: 'Подтягивания', targetMuscleGroup: 'Спина', defaultSets: 3, defaultReps: 8, defaultRestTimeSeconds: 90 },
];

// History cache epoch. Subscribers (e.g. WorkoutConstructor) bump their caches
// when this changes. Used to invalidate stale per-exercise history caches on
// sign-out, reset, plan edits, etc. — without coupling them to the full
// AppContext.
let _historyCacheEpoch = 0;
const historyCacheSubscribers = new Set<(epoch: number) => void>();
export function getHistoryCacheEpoch(): number { return _historyCacheEpoch; }
export function subscribeHistoryCache(fn: (epoch: number) => void): () => void {
  historyCacheSubscribers.add(fn);
  return () => { historyCacheSubscribers.delete(fn); };
}
function bumpHistoryCache() {
  _historyCacheEpoch += 1;
  historyCacheSubscribers.forEach(fn => fn(_historyCacheEpoch));
}

// Subscribers receive sync error notifications. Using a Set + subscribe/unsubscribe
// is safe under React StrictMode (double-mount), HMR, and unmount, unlike a single
// module-level mutable reference.
const errorSubscribers = new Set<(msg: string | null) => void>();
function notifySyncError(msg: string | null) {
  errorSubscribers.forEach(fn => fn(msg));
}

// Awaits the supabase result, checks the `error` field returned by PostgREST
// (Supabase JS does NOT reject on HTTP errors), and rolls back optimistic
// updates if anything went wrong.
async function supaSafe<T>(promise: PromiseLike<T>, label: string, rollback?: () => void): Promise<void> {
  try {
    const result = await Promise.resolve(promise);
    if (isSupaResult(result) && result.error) {
      console.error(`Supabase ${label} error:`, result.error);
      notifySyncError(`Ошибка сохранения: ${label}`);
      rollback?.();
      setTimeout(() => notifySyncError(null), 5000);
    }
  } catch (e: unknown) {
    console.error(`Supabase ${label} threw:`, e);
    notifySyncError(`Ошибка сохранения: ${label}`);
    rollback?.();
    setTimeout(() => notifySyncError(null), 5000);
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        version?: string;
        platform?: string;
        ready?: () => void;
      };
    };
  }
}

// ===================== Context types =====================

interface UIContextType {
  loading: boolean;
  needsLogin: boolean;
  isTelegram: boolean;
  userProfile: UserProfile | null;
  loadError: string | null;
  syncError: string | null;
  handleWidgetAuth: (data: { first_name?: string; username?: string; photo_url?: string }) => void;
  updateFitnessProfile: (patch: Partial<Omit<UserProfile, 'first_name' | 'username' | 'photo_url'>>) => Promise<void>;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: 'plan' | 'diary';
  setViewMode: (mode: 'plan' | 'diary') => void;
}

interface WorkoutDataContextType {
  exerciseDb: BaseExercise[];
  addExerciseToDb: (exercise: Omit<BaseExercise, 'id'>) => void;
  updateExerciseInDb: (id: string, exercise: Omit<BaseExercise, 'id'>) => void;
  deleteExerciseFromDb: (id: string) => void;
  plannedWorkouts: PlannedWorkoutsDict;
  addExerciseToPlan: (dateStr: string, exercise: BaseExercise, sets: number, reps: number, restTimeSeconds?: number) => void;
  updatePlanExercise: (dateStr: string, workoutId: string, updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'restTimeSeconds' | 'weightKg'>>) => void;
  removeExerciseFromPlan: (dateStr: string, workoutId: string) => void;
  completedSets: CompletedSetsDict;
  toggleSetCompletion: (dateStr: string, workoutId: string, setIndex: number, isCompleted: boolean) => void;
  dailyDurations: Record<string, number>;
  userStats: UserStats;
  resetUserStats: () => void;
  actualExerciseRests: Record<string, number>;
  finishWorkout: () => void;
  bodyMetrics: BodyMetric[];
  saveBodyMetrics: (metrics: Partial<BodyMetric>) => Promise<void>;
  coachMessages: CoachMessage[];
  sendCoachMessage: (messageText: string) => Promise<void>;
  activeAdaptation: CoachAdaptation | null;
  applyAdaptationAction: (id: string) => Promise<void>;
  dismissAdaptationAction: (id: string) => Promise<void>;
}

interface TimerContextType {
  workoutStartTime: number | null;
  workoutAccumulatedMs: number;
  isWorkoutPaused: boolean;
  startWorkoutTimer: () => void;
  pauseWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;
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
}

// ===================== Contexts =====================

const UIContext = createContext<UIContextType | undefined>(undefined);
const WorkoutDataContext = createContext<WorkoutDataContextType | undefined>(undefined);
const TimerContext = createContext<TimerContextType | undefined>(undefined);

// ===================== Provider =====================

export function AppProvider({ children }: { children: ReactNode }) {
  // --- UI state ---
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Subscribe to global sync error notifications. Multiple providers / StrictMode
  // double-mounts will register independently and clean up on unmount.
  useEffect(() => {
    errorSubscribers.add(setSyncError);
    return () => {
      errorSubscribers.delete(setSyncError);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'plan' | 'diary'>('plan');

  // --- Workout data ---
  const [exerciseDb, setExerciseDb] = useState<BaseExercise[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkoutsDict>({});
  const [completedSets, setCompletedSets] = useState<CompletedSetsDict>({});
  const [dailyDurations, setDailyDurations] = useState<Record<string, number>>({});
  const [actualExerciseRests, setActualExerciseRests] = useState<Record<string, number>>({});
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [activeAdaptation, setActiveAdaptation] = useState<CoachAdaptation | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0, achievements: {},
  });

  // --- Timer state ---
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

  // --- Ensure profile row exists for current auth.uid() ---
  const ensureProfile = useCallback(async (profileData?: Partial<UserProfile>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        telegram_id: user.user_metadata?.telegram_id ?? null,
        first_name: profileData?.first_name ?? user.user_metadata?.first_name ?? null,
        username: profileData?.username ?? null,
        photo_url: profileData?.photo_url ?? null,
      });
    }
  }, []);

  // --- Seed default exercises for new users ---
  const seedDefaultExercises = useCallback(async () => {
    const seeded: BaseExercise[] = [];
    for (const ex of defaultExercises) {
      const id = crypto.randomUUID();
      seeded.push({ ...ex, id });
      supaSafe(
        supabase.from('exercises').insert({
          id,
          name: ex.name,
          target_muscle_group: ex.targetMuscleGroup ?? null,
          default_sets: ex.defaultSets ?? 3,
          default_reps: ex.defaultReps ?? 10,
          default_rest_time_seconds: ex.defaultRestTimeSeconds ?? 90,
          default_weight_kg: ex.defaultWeightKg ?? null,
        }),
        'seed exercise',
        () => setExerciseDb(prev => prev.filter(e => e.id !== id)),
      );
    }
    setExerciseDb(seeded);
  }, []);

  // --- Load data from Supabase ---
  const loadFromSupabase = useCallback(async () => {
    try {
      // Ensure session is active before querying (guards against race conditions)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('loadFromSupabase called without active session, skipping');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      const [
        { data: profile },
        { data: exercises },
        { data: wp },
        { data: cs },
        { data: ws },
        { data: er },
        { data: ua },
        { data: bm },
        { data: ccm }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('exercises').select('*').is('archived_at', null).order('created_at'),
        supabase.from('workout_plans').select('*').gte('plan_date', since).order('sort_order'),
        supabase.from('completed_sets').select('*').gte('plan_date', since),
        supabase.from('workout_sessions').select('plan_date, duration_seconds').gte('plan_date', since),
        supabase.from('exercise_rests').select('*').gte('recorded_at', since),
        supabase.from('user_achievements').select('*'),
        supabase.from('body_metrics').select('*').order('date', { ascending: false }).limit(60),
        supabase.from('coach_chat_messages').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (profile) {
        setUserProfile(prev => ({
          first_name: profile.first_name || prev?.first_name,
          username: profile.username || prev?.username,
          photo_url: profile.photo_url || prev?.photo_url,
          fitness_goal: profile.fitness_goal,
          fitness_level: profile.fitness_level,
          available_minutes: profile.available_minutes,
          training_location: profile.training_location,
          equipment: profile.equipment,
          birth_year: profile.birth_year,
          gender: profile.gender,
        }));
      }

      const exerciseData = (exercises ?? []).map((r: ExerciseRow) => ({
        id: r.id, name: r.name, targetMuscleGroup: r.target_muscle_group ?? undefined,
        defaultSets: r.default_sets, defaultReps: r.default_reps,
        defaultRestTimeSeconds: r.default_rest_time_seconds,
        defaultWeightKg: r.default_weight_kg != null ? Number(r.default_weight_kg) : undefined,
      }));
      setExerciseDb(exerciseData);

      if (exerciseData.length === 0) {
        // Double-check: verify session is active before seeding
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await seedDefaultExercises();
        }
      }

      const plans: PlannedWorkoutsDict = {};
      for (const r of (wp ?? []) as WorkoutPlanRow[]) {
        if (!plans[r.plan_date]) plans[r.plan_date] = [];
        plans[r.plan_date].push({
          id: r.exercise_id ?? '', name: r.name, targetMuscleGroup: r.target_muscle_group ?? undefined,
          defaultSets: undefined, defaultReps: undefined, defaultRestTimeSeconds: undefined, defaultWeightKg: undefined,
          workoutId: r.id, sets: r.sets, reps: r.reps, restTimeSeconds: r.rest_time_seconds,
          weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
        });
      }
      setPlannedWorkouts(plans);

      const sets: CompletedSetsDict = {};
      for (const r of (cs ?? []) as CompletedSetRow[]) { sets[`${r.plan_date}_${r.workout_plan_id}_${r.set_index}`] = true; }
      setCompletedSets(sets);

      const durations: Record<string, number> = {};
      for (const r of (ws ?? []) as SessionRow[]) { durations[r.plan_date] = (durations[r.plan_date] ?? 0) + r.duration_seconds; }
      setDailyDurations(durations);

      const rests: Record<string, number> = {};
      for (const r of (er ?? []) as ExerciseRestRow[]) {
        const d = format(new Date(r.recorded_at), 'yyyy-MM-dd');
        rests[`${d}_${r.workout_plan_id}`] = (rests[`${d}_${r.workout_plan_id}`] ?? 0) + r.actual_rest_seconds;
      }
      setActualExerciseRests(rests);

      const ach: Record<string, number> = {};
      for (const r of (ua ?? []) as AchievementRow[]) { ach[r.achievement_type] = new Date(r.unlocked_at).getTime(); }
      setUserStats(prev => ({ ...prev, achievements: ach }));

      setBodyMetrics((bm ?? []) as BodyMetric[]);

      const msgData = (ccm ?? []).map((r: any) => ({
        id: r.id,
        sender: r.sender as 'user' | 'coach',
        message: r.message,
        created_at: r.created_at
      })).reverse();
      setCoachMessages(msgData);

      // Попытка загрузить рекомендации ИИ-тренера по адаптации
      try {
        const adData = await fetchCoachAdaptation();
        if (adData && 'status' in adData && adData.status === 'no_adaptation_needed') {
          setActiveAdaptation(null);
        } else if (adData) {
          setActiveAdaptation(adData as CoachAdaptation);
        }
      } catch (e) {
        console.error('Failed to load coach adaptation:', e);
      }

      // We just (re)loaded fresh data, possibly for a different user — drop any
      // out-of-tree per-exercise history caches that may have been populated
      // for the previous session.
      bumpHistoryCache();

      setLoading(false);
    } catch (err) {
      console.error('Failed to load from Supabase:', err);
      setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
      setLoading(false);
    }
  }, [seedDefaultExercises]);

  // --- Init: always authenticate via Telegram, always load from Supabase ---
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const isTg = !!session.user?.user_metadata?.telegram_id;
          if (isTg) {
            setIsTelegram(true);
            setUserProfile({
              first_name: session.user.user_metadata.first_name,
              username: session.user.user_metadata.username,
              photo_url: session.user.user_metadata.photo_url,
            });
            await ensureProfile();
            await loadFromSupabase();
            return;
          }
          await supabase.auth.signOut();
        }

        // Detect Telegram environment properly (works on Desktop, Web, iOS, Android)
        // Wait up to 3 seconds for Telegram.WebApp.initData to become available
        let initData = '';
        let isInsideTelegram = false;
        
        const tgProxy = (window as any).TelegramWebviewProxy;
        
        for (let i = 0; i < 30; i++) {
          const webApp = window.Telegram?.WebApp;
          initData = webApp?.initData || '';
          
          // If initData is present, we are definitely in Telegram
          if (initData) {
            isInsideTelegram = true;
            break;
          }
          
          // If platform is known, we are in Telegram
          if (webApp?.platform && webApp.platform !== 'unknown') {
            isInsideTelegram = true;
            if (i > 5) break; // Give it a bit more time for initData
          }
          
          // Fallback check for native mobile clients
          if (tgProxy) {
            isInsideTelegram = true;
          }
          
          // If no proxy, platform is unknown, and we've waited 500ms, assume not in Telegram
          if (!tgProxy && (!webApp || webApp.platform === 'unknown') && i > 4) {
            break;
          }
          
          await new Promise(r => setTimeout(r, 100));
        }

        if (isInsideTelegram) {
          if (!initData) {
            setIsTelegram(true);
            const tgWebApp = window.Telegram?.WebApp;
            const debug = [
              `WebApp: ${!!tgWebApp}`,
              `initData: "${initData}"`,
              `version: ${tgWebApp?.version ?? 'N/A'}`,
              `platform: ${tgWebApp?.platform ?? 'N/A'}`,
            ].join(', ');
            setLoadError(`Не удалось получить initData. Попробуйте открыть приложение через меню бота. Debug: ${debug}`);
            setLoading(false);
            return;
          }
          const result = await authViaTelegram(initData);
          if (result) {
            setIsTelegram(true);
            setUserProfile({ first_name: result.first_name, username: result.username, photo_url: result.photo_url });
            await ensureProfile({ first_name: result.first_name, username: result.username, photo_url: result.photo_url });
            await loadFromSupabase();
            return;
          }
          setIsTelegram(true);
          // Try to get more details about the failure
          const { data: rawData, error: rawErr } = await supabase.functions.invoke("telegram-auth", {
            body: { initData },
          });
          const errDetail = rawErr ? String(rawErr) : JSON.stringify(rawData);
          setLoadError(`Ошибка авторизации через Telegram. Detail: ${errDetail}`);
          setLoading(false);
          return;
        }

        setNeedsLogin(true);
        setLoading(false);
      } catch (err) {
        console.error('Init failed:', err);
        setLoadError(err instanceof Error ? err.message : 'Не удалось инициализировать приложение');
        setLoading(false);
      }
    })();
  }, [loadFromSupabase, ensureProfile]);

  // --- Realtime sync between user devices.
  // Only run after we have a session AND data is loaded — otherwise events
  // would arrive before the local state is initialized.
  useEffect(() => {
    if (loading) return;
    if (!isTelegram) return;

    const unsubscribe = subscribeFitnessRealtime({
      onExerciseChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT' || ev === 'UPDATE') {
          const r = payload.new;
          // Filter out archived exercises on read events — we don't want to
          // accidentally show a deleted exercise back to the user.
          if (r.archived_at) {
            setExerciseDb(prev => prev.filter(e => e.id !== r.id));
            return;
          }
          const mapped: BaseExercise = {
            id: r.id,
            name: r.name,
            targetMuscleGroup: r.target_muscle_group ?? undefined,
            defaultSets: r.default_sets,
            defaultReps: r.default_reps,
            defaultRestTimeSeconds: r.default_rest_time_seconds,
            defaultWeightKg: r.default_weight_kg != null ? Number(r.default_weight_kg) : undefined,
          };
          setExerciseDb(prev => {
            const idx = prev.findIndex(e => e.id === r.id);
            if (idx === -1) return [...prev, mapped];
            // Keep order, replace in place.
            return prev.map((e, i) => i === idx ? mapped : e);
          });
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (old?.id) setExerciseDb(prev => prev.filter(e => e.id !== old.id));
        }
        bumpHistoryCache();
      },

      onPlanChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT' || ev === 'UPDATE') {
          const r = payload.new;
          const mapped: WorkoutExercise = {
            id: r.exercise_id ?? '',
            name: r.name,
            targetMuscleGroup: r.target_muscle_group ?? undefined,
            defaultSets: undefined,
            defaultReps: undefined,
            defaultRestTimeSeconds: undefined,
            defaultWeightKg: undefined,
            workoutId: r.id,
            sets: r.sets,
            reps: r.reps,
            restTimeSeconds: r.rest_time_seconds ?? undefined,
            weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
          };
          setPlannedWorkouts(prev => {
            const day = prev[r.plan_date] ?? [];
            const idx = day.findIndex(w => w.workoutId === r.id);
            const nextDay = idx === -1 ? [...day, mapped] : day.map((w, i) => i === idx ? mapped : w);
            return { ...prev, [r.plan_date]: nextDay };
          });
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (!old?.id) return;
          setPlannedWorkouts(prev => {
            // We don't know plan_date in DELETE payload reliably (Supabase
            // sends only the PK by default). Sweep all dates instead.
            const next: PlannedWorkoutsDict = {};
            for (const [date, list] of Object.entries(prev)) {
              const filtered = list.filter(w => w.workoutId !== old.id);
              if (filtered.length) next[date] = filtered;
            }
            return next;
          });
          // Also drop completed_sets that referenced this plan row.
          setCompletedSets(prev => {
            const next: CompletedSetsDict = {};
            for (const k of Object.keys(prev)) {
              if (!k.includes(old.id)) next[k] = prev[k];
            }
            return next;
          });
        }
        bumpHistoryCache();
      },

      onCompletedSetChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT' || ev === 'UPDATE') {
          const r = payload.new;
          const key = `${r.plan_date}_${r.workout_plan_id}_${r.set_index}`;
          setCompletedSets(prev => prev[key] ? prev : { ...prev, [key]: true });
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (!old?.workout_plan_id) return;
          // DELETE payload usually carries only PK — match by workout_plan_id + set_index if present.
          setCompletedSets(prev => {
            const next: CompletedSetsDict = {};
            for (const k of Object.keys(prev)) {
              const matchesPlan = k.includes(old.workout_plan_id);
              const matchesIdx = old.set_index == null ? true : k.endsWith(`_${old.set_index}`);
              if (matchesPlan && matchesIdx) continue;
              next[k] = prev[k];
            }
            return next;
          });
        }
      },

      // Workout sessions: each row is a finished session worth N seconds.
      // We aggregate by date in `dailyDurations`. INSERTs add to the date
      // bucket; deletes / sweeps are rare but we recover-by-reload.
      onWorkoutSessionChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT') {
          const r = payload.new;
          setDailyDurations(prev => ({
            ...prev,
            [r.plan_date]: (prev[r.plan_date] ?? 0) + (r.duration_seconds || 0),
          }));
        } else if (ev === 'DELETE') {
          // Without aggregating context, the safest move is a soft refresh:
          // realtime DELETE payload doesn't carry duration_seconds, so we'd
          // need to refetch. Keep this no-op for now — manual reload covers it.
        }
      },

      // Exercise rests: aggregated per (date, workout_plan_id) in
      // `actualExerciseRests`. INSERTs are the only typical event.
      onExerciseRestChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT') {
          const r = payload.new;
          const recorded = (r.recorded_at || '').slice(0, 10) || format(new Date(), 'yyyy-MM-dd');
          const key = `${recorded}_${r.workout_plan_id}`;
          setActualExerciseRests(prev => ({
            ...prev,
            [key]: (prev[key] ?? 0) + (r.actual_rest_seconds || 0),
          }));
        }
      },

      onBodyMetricsChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT' || ev === 'UPDATE') {
          const r = payload.new;
          const mapped: BodyMetric = {
            id: r.id,
            date: r.date,
            weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
            chest_cm: r.chest_cm != null ? Number(r.chest_cm) : null,
            bicep_r_cm: r.bicep_r_cm != null ? Number(r.bicep_r_cm) : null,
            bicep_l_cm: r.bicep_l_cm != null ? Number(r.bicep_l_cm) : null,
            waist_cm: r.waist_cm != null ? Number(r.waist_cm) : null,
            hips_cm: r.hips_cm != null ? Number(r.hips_cm) : null,
            thigh_r_cm: r.thigh_r_cm != null ? Number(r.thigh_r_cm) : null,
            thigh_l_cm: r.thigh_l_cm != null ? Number(r.thigh_l_cm) : null,
            notes: r.notes,
          };
          setBodyMetrics(prev => {
            const idx = prev.findIndex(m => m.date === r.date);
            let next: BodyMetric[];
            if (idx === -1) {
              next = [mapped, ...prev];
            } else {
              next = prev.map((m, i) => i === idx ? mapped : m);
            }
            return next.sort((a, b) => b.date.localeCompare(a.date));
          });
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (old?.id) {
            setBodyMetrics(prev => prev.filter(m => m.id !== old.id));
          }
        }
      },

      onCoachMessageChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT') {
          const r = payload.new;
          const mapped: CoachMessage = {
            id: r.id,
            sender: r.sender,
            message: r.message,
            created_at: r.created_at,
          };
          setCoachMessages(prev => {
            if (prev.some(m => m.id === r.id || (m.sender === r.sender && m.message === r.message && m.id.startsWith('temp-')))) {
              return prev.map(m => 
                (m.sender === r.sender && m.message === r.message && m.id.startsWith('temp-')) ? mapped : m
              );
            }
            return [...prev, mapped];
          });
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (old?.id) {
            setCoachMessages(prev => prev.filter(m => m.id !== old.id));
          }
        }
      },

      onCoachAdaptationChange: (payload) => {
        const ev = payload.eventType;
        if (ev === 'INSERT' || ev === 'UPDATE') {
          const r = payload.new;
          if (r.status === 'pending') {
            const mapped: CoachAdaptation = {
              id: r.id,
              status: r.status as 'pending' | 'applied' | 'dismissed',
              explanation: r.explanation,
              suggested_changes: r.suggested_changes,
              created_at: r.created_at,
            };
            setActiveAdaptation(mapped);
          } else {
            setActiveAdaptation(prev => prev?.id === r.id ? null : prev);
          }
        } else if (ev === 'DELETE') {
          const old = payload.old;
          if (old?.id) {
            setActiveAdaptation(prev => prev?.id === old.id ? null : prev);
          }
        }
      },
    });

    return unsubscribe;
  }, [loading, isTelegram]);

  // --- Handle Telegram Login Widget callback ---
  const handleWidgetAuth = useCallback(async (data: { first_name?: string; username?: string; photo_url?: string }) => {
    setLoading(true);
    setNeedsLogin(false);
    setIsTelegram(true);
    setUserProfile(data);
    await ensureProfile(data);
    await loadFromSupabase();
  }, [ensureProfile, loadFromSupabase]);

  const updateFitnessProfile = useCallback(async (patch: Partial<Omit<UserProfile, 'first_name' | 'username' | 'photo_url'>>) => {
    setUserProfile(prev => prev ? { ...prev, ...patch } : null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supaSafe(
      supabase.from('profiles').update(patch).eq('id', user.id),
      'profiles update',
      () => {
        // Rollback: reload from database to restore original state on error
        loadFromSupabase();
      }
    );
  }, [loadFromSupabase]);

  // --- Stats derivation ---
  // IMPORTANT: this effect must NOT depend on userStats.achievements, otherwise
  // it would re-run every time it mutates achievements and create a render loop.
  // We use a functional setUserStats(prev => ...) so the latest value is always
  // taken from React state, and we only enqueue a state update when something
  // actually changed (deep-compared).
  useEffect(() => {
    let totalSeconds = 0;
    for (const d of Object.values(dailyDurations)) totalSeconds += d as number;
    const totalSetsCompleted = Object.values(completedSets).filter(v => v).length;

    if (!totalSetsCompleted && !totalSeconds) {
      setUserStats(prev => {
        if (prev.totalWorkoutSeconds === 0 && prev.totalSets === 0 && prev.currentStreak === 0) {
          return prev;
        }
        return { ...prev, totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0 };
      });
      return;
    }

    const activeDates = [...new Set(Object.keys(completedSets).map(k => k.split('_')[0]))].sort((a, b) => b.localeCompare(a));
    let streak = 0, cd = new Date();
    for (const ds of activeDates) {
      const diff = differenceInCalendarDays(cd, parseISO(ds));
      if (diff <= 1) { streak++; cd = parseISO(ds); } else break;
    }
    const finalStreak = totalSetsCompleted > 0 ? Math.max(streak, 1) : 0;

    const now = Date.now();
    // We use a ref to communicate newly-unlocked achievements from inside the
    // functional updater to the persistence logic outside. This avoids the
    // StrictMode double-invocation race where a closure-captured mutable object
    // could end up empty on the second invocation.
    const newlyUnlockedRef: { current: Record<string, number> } = { current: {} };

    setUserStats(prev => {
      const unlocked: Record<string, number> = {};
      if (totalSetsCompleted > 0 && !prev.achievements['first_workout']) unlocked['first_workout'] = now;
      if (finalStreak >= 3 && !prev.achievements['streak_3']) unlocked['streak_3'] = now;
      if (finalStreak >= 7 && !prev.achievements['streak_7']) unlocked['streak_7'] = now;
      if (totalSeconds >= 5 * 3600 && !prev.achievements['time_5h']) unlocked['time_5h'] = now;
      if (totalSetsCompleted >= 100 && !prev.achievements['volume_100']) unlocked['volume_100'] = now;

      const noStatChange =
        prev.totalWorkoutSeconds === totalSeconds &&
        prev.totalSets === totalSetsCompleted &&
        prev.currentStreak === finalStreak;
      const noAchievementChange = Object.keys(unlocked).length === 0;

      // Bail out: nothing changed → return same reference, no re-render, no loop.
      if (noStatChange && noAchievementChange) return prev;

      // Store the final unlocked set for persistence after the updater completes.
      newlyUnlockedRef.current = unlocked;

      return {
        totalWorkoutSeconds: totalSeconds,
        totalSets: totalSetsCompleted,
        currentStreak: finalStreak,
        achievements: noAchievementChange ? prev.achievements : { ...prev.achievements, ...unlocked },
      };
    });

    // Persist newly unlocked achievements. We read from the ref which was
    // populated by the last updater invocation (the one React actually committed).
    for (const [type, time] of Object.entries(newlyUnlockedRef.current)) {
      supaSafe(
        supabase.from('user_achievements').upsert(
          { achievement_type: type, unlocked_at: new Date(time).toISOString() },
          { onConflict: 'user_id, achievement_type' },
        ),
        `achievement ${type}`,
      );
    }
  }, [completedSets, dailyDurations]);

  // --- Timer logic ---
  const startWorkoutTimer = useCallback(() => {
    if (isWorkoutPaused) { setWorkoutStartTime(Date.now()); setIsWorkoutPaused(false); }
    else if (!workoutStartTime) { setWorkoutStartTime(Date.now()); setWorkoutAccumulatedMs(0); setIsWorkoutPaused(false); }
  }, [isWorkoutPaused, workoutStartTime]);

  const pauseWorkoutTimer = useCallback(() => {
    if (workoutStartTime && !isWorkoutPaused) {
      setWorkoutAccumulatedMs(prev => prev + (Date.now() - workoutStartTime));
      setWorkoutStartTime(null); setIsWorkoutPaused(true);
    }
  }, [workoutStartTime, isWorkoutPaused]);

  const resetWorkoutTimer = useCallback(() => { setWorkoutStartTime(null); setWorkoutAccumulatedMs(0); setIsWorkoutPaused(false); }, []);

  const recordRest = useCallback(() => {
    if (restContext?.type === 'exercise' && restStartTime) {
      let p = restAccumulatedPause;
      if (isRestPaused && restPausedAt) p += Date.now() - restPausedAt;
      const elapsed = Math.floor((Date.now() - restStartTime - p) / 1000);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const rk = `${dateStr}_${restContext.workoutId}`;
      setActualExerciseRests(prev => ({ ...prev, [rk]: (prev[rk] ?? 0) + elapsed }));
      supaSafe(supabase.from('exercise_rests').insert({ workout_plan_id: restContext.workoutId, actual_rest_seconds: elapsed }), 'exercise_rests insert');
    }
  }, [restContext, restStartTime, restAccumulatedPause, isRestPaused, restPausedAt, selectedDate]);

  const startRestTimer = useCallback((durationSeconds: number, context: RestContext) => {
    recordRest();
    setRestTimerDuration(durationSeconds);
    setRestTimerEnd(Date.now() + durationSeconds * 1000);
    setRestContext(context);
    setIsRestPaused(false);
    setRestStartTime(Date.now()); setRestPausedAt(null); setRestAccumulatedPause(0);
  }, [recordRest]);

  const pauseRestTimer = useCallback(() => {
    if (restTimerEnd && !isRestPaused) { setRestRemainingAtPause(restTimerEnd - Date.now()); setIsRestPaused(true); setRestPausedAt(Date.now()); }
  }, [restTimerEnd, isRestPaused]);

  const resumeRestTimer = useCallback(() => {
    if (isRestPaused && restContext) {
      setRestTimerEnd(Date.now() + restRemainingAtPause); setIsRestPaused(false);
      if (restPausedAt) { setRestAccumulatedPause(prev => prev + (Date.now() - restPausedAt)); setRestPausedAt(null); }
    }
  }, [isRestPaused, restContext, restRemainingAtPause, restPausedAt]);

  const clearRestTimer = useCallback(() => {
    recordRest();
    setRestTimerEnd(null); setRestTimerDuration(0); setRestContext(null); setIsRestPaused(false);
    setRestStartTime(null); setRestPausedAt(null); setRestAccumulatedPause(0);
  }, [recordRest]);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    const dm = deltaSeconds * 1000;
    if (isRestPaused) {
      let nr = restRemainingAtPause + dm; if (nr < 0) nr = 0;
      setRestRemainingAtPause(nr); setRestTimerDuration(prev => Math.max(prev, nr / 1000));
    } else if (restTimerEnd) {
      let ne = restTimerEnd + dm; if (ne < Date.now()) ne = Date.now();
      setRestTimerEnd(ne); setRestTimerDuration(prev => Math.max(prev, (ne - Date.now()) / 1000));
    }
  }, [isRestPaused, restRemainingAtPause, restTimerEnd]);

  // --- CRUD with Supabase sync + rollback (always syncs) ---
  const addExerciseToDb = useCallback((ex: Omit<BaseExercise, 'id'>) => {
    const n = { ...ex, id: crypto.randomUUID() };
    setExerciseDb(prev => [...prev, n]);
    supaSafe(
      supabase.from('exercises').insert({ id: n.id, name: n.name, target_muscle_group: n.targetMuscleGroup ?? null, default_sets: n.defaultSets ?? 3, default_reps: n.defaultReps ?? 10, default_rest_time_seconds: n.defaultRestTimeSeconds ?? 90, default_weight_kg: n.defaultWeightKg ?? null }),
      'exercises insert',
      () => setExerciseDb(prev => prev.filter(e => e.id !== n.id)),
    );
  }, []);

  const updateExerciseInDb = useCallback((id: string, ex: Omit<BaseExercise, 'id'>) => {
    setExerciseDb(prev => {
      const old = prev.find(e => e.id === id);
      const rollback = () => { if (old) setExerciseDb(p => p.map(e => e.id === id ? old : e)); };
      supaSafe(
        supabase.from('exercises').update({ name: ex.name, target_muscle_group: ex.targetMuscleGroup ?? null, default_sets: ex.defaultSets ?? 3, default_reps: ex.defaultReps ?? 10, default_rest_time_seconds: ex.defaultRestTimeSeconds ?? 90, default_weight_kg: ex.defaultWeightKg ?? null }).eq('id', id),
        'exercises update',
        rollback,
      );
      return prev.map(e => e.id === id ? { ...ex, id } : e);
    });
  }, []);

  const deleteExerciseFromDb = useCallback((id: string) => {
    // Soft-delete: mark as archived instead of hard-deleting, so that
    // workout_plans.exercise_id references and exercise history remain intact.
    setExerciseDb(prev => {
      const removed = prev.find(e => e.id === id);
      const next = prev.filter(e => e.id !== id);
      if (removed) {
        supaSafe(
          supabase.from('exercises').update({ archived_at: new Date().toISOString() }).eq('id', id),
          'exercises archive',
          () => setExerciseDb(p => [...p, removed]),
        );
      }
      return next;
    });
  }, []);

  const addExerciseToPlan = useCallback((dateStr: string, exercise: BaseExercise, sets: number, reps: number, rt?: number) => {
    const wid = crypto.randomUUID();
    const weightKg = exercise.defaultWeightKg;
    const newItem = { ...exercise, workoutId: wid, sets, reps, restTimeSeconds: rt, weightKg };
    setPlannedWorkouts(prev => {
      const today = prev[dateStr] ?? [];
      const newSortOrder = today.length;
      supaSafe(
        supabase.from('workout_plans').insert({ id: wid, plan_date: dateStr, exercise_id: exercise.id, name: exercise.name, target_muscle_group: exercise.targetMuscleGroup ?? null, sets, reps, rest_time_seconds: rt ?? null, weight_kg: weightKg ?? null, sort_order: newSortOrder }),
        'workout_plans insert',
        () => setPlannedWorkouts(p => ({ ...p, [dateStr]: (p[dateStr] ?? []).filter(e => e.workoutId !== wid) })),
      );
      return { ...prev, [dateStr]: [...today, newItem] };
    });
    // Plan changed → exercise history caches are now stale.
    bumpHistoryCache();
  }, []);

  const updatePlanExercise = useCallback((dateStr: string, wid: string, updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'restTimeSeconds' | 'weightKg'>>) => {
    setPlannedWorkouts(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] ?? []).map(ex => ex.workoutId === wid ? { ...ex, ...updates } : ex),
    }));
    const sbUpdates: Record<string, unknown> = {};
    if (updates.sets !== undefined) sbUpdates.sets = updates.sets;
    if (updates.reps !== undefined) sbUpdates.reps = updates.reps;
    if (updates.restTimeSeconds !== undefined) sbUpdates.rest_time_seconds = updates.restTimeSeconds ?? null;
    if (updates.weightKg !== undefined) sbUpdates.weight_kg = updates.weightKg ?? null;
    supaSafe(supabase.from('workout_plans').update(sbUpdates).eq('id', wid), 'workout_plans update');
    bumpHistoryCache();
  }, []);

  const removeExerciseFromPlan = useCallback((dateStr: string, wid: string) => {
    setPlannedWorkouts(prev => ({ ...prev, [dateStr]: (prev[dateStr] ?? []).filter(e => e.workoutId !== wid) }));
    setCompletedSets(prev => { const n = { ...prev }; for (const k of Object.keys(n)) { if (k.includes(wid)) delete n[k]; } return n; });
    supaSafe(supabase.from('workout_plans').delete().eq('id', wid), 'workout_plans delete');
    supaSafe(supabase.from('completed_sets').delete().eq('workout_plan_id', wid), 'completed_sets delete');
    bumpHistoryCache();
  }, []);

  const toggleSetCompletion = useCallback((dateStr: string, wid: string, si: number, done: boolean) => {
    if (done && !workoutStartTime && !workoutAccumulatedMs) startWorkoutTimer();
    const key = `${dateStr}_${wid}_${si}`;
    if (!done) {
      setCompletedSets(prev => { const n = { ...prev }; delete n[key]; return n; });
      supaSafe(supabase.from('completed_sets').delete().eq('workout_plan_id', wid).eq('set_index', si), 'completed_sets delete');
    } else {
      setCompletedSets(prev => ({ ...prev, [key]: true }));
      supaSafe(
        supabase.from('completed_sets').upsert({ workout_plan_id: wid, plan_date: dateStr, set_index: si }, { onConflict: 'user_id, workout_plan_id, set_index' }),
        'completed_sets upsert',
        () => setCompletedSets(prev => { const n = { ...prev }; delete n[key]; return n; }),
      );
    }
  }, [workoutStartTime, workoutAccumulatedMs, startWorkoutTimer]);

  const finishWorkout = useCallback(() => {
    const elapsedMs = workoutAccumulatedMs + (workoutStartTime && !isWorkoutPaused ? Date.now() - workoutStartTime : 0);
    const secs = Math.floor(elapsedMs / 1000);
    if (secs > 0) {
      const ds = format(selectedDate, 'yyyy-MM-dd');
      setDailyDurations(prev => ({ ...prev, [ds]: (prev[ds] ?? 0) + secs }));
      supaSafe(supabase.from('workout_sessions').insert({ plan_date: ds, duration_seconds: secs }), 'workout_sessions insert');
    }
    resetWorkoutTimer(); clearRestTimer();
  }, [workoutAccumulatedMs, workoutStartTime, isWorkoutPaused, selectedDate, resetWorkoutTimer, clearRestTimer]);

  const saveBodyMetrics = useCallback(async (data: Partial<BodyMetric>) => {
    if (!data.date) return;
    const weight_kg = data.weight_kg !== undefined ? data.weight_kg : null;
    const chest_cm = data.chest_cm !== undefined ? data.chest_cm : null;
    const bicep_r_cm = data.bicep_r_cm !== undefined ? data.bicep_r_cm : null;
    const bicep_l_cm = data.bicep_l_cm !== undefined ? data.bicep_l_cm : null;
    const waist_cm = data.waist_cm !== undefined ? data.waist_cm : null;
    const hips_cm = data.hips_cm !== undefined ? data.hips_cm : null;
    const thigh_r_cm = data.thigh_r_cm !== undefined ? data.thigh_r_cm : null;
    const thigh_l_cm = data.thigh_l_cm !== undefined ? data.thigh_l_cm : null;
    const notes = data.notes !== undefined ? data.notes : null;

    const id = data.id || crypto.randomUUID();
    const updatedItem: BodyMetric = {
      id,
      date: data.date,
      weight_kg,
      chest_cm,
      bicep_r_cm,
      bicep_l_cm,
      waist_cm,
      hips_cm,
      thigh_r_cm,
      thigh_l_cm,
      notes,
    };

    let originalState: BodyMetric[] = [];
    setBodyMetrics(prev => {
      originalState = prev;
      const idx = prev.findIndex(m => m.date === data.date);
      let next: BodyMetric[];
      if (idx === -1) {
        next = [updatedItem, ...prev];
      } else {
        next = prev.map((m, i) => i === idx ? { ...m, ...data } : m);
      }
      return next.sort((a, b) => b.date.localeCompare(a.date));
    });

    await supaSafe(
      supabase.from('body_metrics').upsert({
        id,
        date: data.date,
        weight_kg,
        chest_cm,
        bicep_r_cm,
        bicep_l_cm,
        waist_cm,
        hips_cm,
        thigh_r_cm,
        thigh_l_cm,
        notes,
      }, { onConflict: 'user_id, date' }),
      'body_metrics upsert',
      () => setBodyMetrics(originalState)
    );
  }, []);

  const sendCoachMessageAction = useCallback(async (messageText: string) => {
    const tempId = `temp-${Date.now()}`;
    const userMsg: CoachMessage = {
      id: tempId,
      sender: 'user',
      message: messageText,
      created_at: new Date().toISOString()
    };

    setCoachMessages(prev => [...prev, userMsg]);

    try {
      const reply = await sendCoachMessage(messageText);
      setCoachMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        if (prev.some(m => m.id === reply.id)) {
          return withoutTemp;
        }
        return [...withoutTemp, reply];
      });
    } catch (err) {
      console.error('Failed to send coach message:', err);
      notifySyncError('Не удалось отправить сообщение тренеру.');
      setCoachMessages(prev => prev.filter(m => m.id !== tempId));
      setTimeout(() => notifySyncError(null), 5000);
      throw err;
    }
  }, []);

  const applyAdaptationAction = useCallback(async (id: string) => {
    const original = activeAdaptation;
    setActiveAdaptation(null);
    try {
      const res = await applyCoachAdaptation(id);
      if (!res.success) {
        throw new Error('Failed to apply adaptation');
      }
      await loadFromSupabase();
    } catch (err) {
      console.error('Failed to apply adaptation:', err);
      notifySyncError('Не удалось применить рекомендации.');
      setActiveAdaptation(original);
      setTimeout(() => notifySyncError(null), 5000);
      throw err;
    }
  }, [activeAdaptation, loadFromSupabase]);

  const dismissAdaptationAction = useCallback(async (id: string) => {
    const original = activeAdaptation;
    setActiveAdaptation(null);
    try {
      const res = await dismissCoachAdaptation(id);
      if (!res.success) {
        throw new Error('Failed to dismiss adaptation');
      }
    } catch (err) {
      console.error('Failed to dismiss adaptation:', err);
      notifySyncError('Не удалось отклонить рекомендации.');
      setActiveAdaptation(original);
      setTimeout(() => notifySyncError(null), 5000);
      throw err;
    }
  }, [activeAdaptation]);

  const resetUserStats = useCallback(() => {
    setDailyDurations({}); setCompletedSets({}); setActualExerciseRests({}); setPlannedWorkouts({}); setBodyMetrics([]); setCoachMessages([]);
    setActiveAdaptation(null);
    setUserStats({ totalWorkoutSeconds: 0, totalSets: 0, currentStreak: 0, achievements: {} });
    supaSafe(supabase.from('workout_sessions').delete().not('id', 'is', null), 'reset workout_sessions');
    supaSafe(supabase.from('completed_sets').delete().not('id', 'is', null), 'reset completed_sets');
    supaSafe(supabase.from('exercise_rests').delete().not('id', 'is', null), 'reset exercise_rests');
    supaSafe(supabase.from('workout_plans').delete().not('id', 'is', null), 'reset workout_plans');
    supaSafe(supabase.from('user_achievements').delete().not('id', 'is', null), 'reset user_achievements');
    supaSafe(supabase.from('body_metrics').delete().not('id', 'is', null), 'reset body_metrics');
    supaSafe(supabase.from('coach_chat_messages').delete().not('id', 'is', null), 'reset coach_chat_messages');
    supaSafe(supabase.from('coach_adaptations').delete().not('id', 'is', null), 'reset coach_adaptations');
    bumpHistoryCache();
  }, []);

  // --- Context values ---
  const uiValue = useMemo(() => ({
    loading, needsLogin, isTelegram, userProfile, loadError, syncError, handleWidgetAuth, updateFitnessProfile,
    activeTab, setActiveTab, selectedDate, setSelectedDate, viewMode, setViewMode,
  }), [
    loading, needsLogin, isTelegram, userProfile, loadError, syncError, handleWidgetAuth, updateFitnessProfile,
    activeTab, selectedDate, viewMode,
  ]);

  const workoutDataValue = useMemo(() => ({
    exerciseDb, addExerciseToDb, updateExerciseInDb, deleteExerciseFromDb,
    plannedWorkouts, addExerciseToPlan, updatePlanExercise, removeExerciseFromPlan,
    completedSets, toggleSetCompletion, dailyDurations, userStats, resetUserStats,
    actualExerciseRests, finishWorkout,
    bodyMetrics, saveBodyMetrics,
    coachMessages, sendCoachMessage: sendCoachMessageAction,
    activeAdaptation, applyAdaptationAction, dismissAdaptationAction,
  }), [
    exerciseDb, addExerciseToDb, updateExerciseInDb, deleteExerciseFromDb,
    plannedWorkouts, addExerciseToPlan, updatePlanExercise, removeExerciseFromPlan,
    completedSets, toggleSetCompletion, dailyDurations, userStats, resetUserStats,
    actualExerciseRests, finishWorkout,
    bodyMetrics, saveBodyMetrics,
    coachMessages, sendCoachMessageAction,
    activeAdaptation, applyAdaptationAction, dismissAdaptationAction,
  ]);

  const timerValue = useMemo(() => ({
    workoutStartTime, workoutAccumulatedMs, isWorkoutPaused,
    startWorkoutTimer, pauseWorkoutTimer, resetWorkoutTimer,
    restTimerEnd, restTimerDuration, restContext, isRestPaused, restRemainingAtPause,
    startRestTimer, pauseRestTimer, resumeRestTimer, clearRestTimer, adjustRestTimer,
  }), [
    workoutStartTime, workoutAccumulatedMs, isWorkoutPaused,
    startWorkoutTimer, pauseWorkoutTimer, resetWorkoutTimer,
    restTimerEnd, restTimerDuration, restContext, isRestPaused, restRemainingAtPause,
    startRestTimer, pauseRestTimer, resumeRestTimer, clearRestTimer, adjustRestTimer,
  ]);

  return (
    <UIContext.Provider value={uiValue}>
      <WorkoutDataContext.Provider value={workoutDataValue}>
        <TimerContext.Provider value={timerValue}>
          {children}
        </TimerContext.Provider>
      </WorkoutDataContext.Provider>
    </UIContext.Provider>
  );
}

// ===================== Hooks =====================

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within AppProvider');
  return ctx;
}

export function useWorkoutData() {
  const ctx = useContext(WorkoutDataContext);
  if (!ctx) throw new Error('useWorkoutData must be used within AppProvider');
  return ctx;
}

export function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimerContext must be used within AppProvider');
  return ctx;
}

export function useAppContext() {
  return { ...useUIContext(), ...useWorkoutData(), ...useTimerContext() };
}
