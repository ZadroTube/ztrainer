import { useEffect, useState, lazy, Suspense } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUIContext, useWorkoutData, useTimerContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  Activity, Calendar as CalendarIcon, PieChart, Play, Pause, RotateCcw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { WorkoutTracker } from '@/components/fitness/WorkoutTracker';
import { WorkoutConstructor } from '@/components/fitness/WorkoutConstructor';
import { SectionHeader } from '@/components/layout/SectionHeader';

const FitnessStats = lazy(() =>
  import('@/components/fitness/FitnessStats').then((m) => ({ default: m.FitnessStats })),
);

/**
 * Header pill: live workout timer with pause/reset.
 *
 * Sits on the right side of the section header. Only renders something when
 * the user actually has a session in flight — otherwise the header is clean.
 * Visually quieter than before: no neon glow, no border-pulse, just a small
 * monospace pill with two icon buttons.
 */
function HeaderControls() {
  const {
    workoutStartTime, workoutAccumulatedMs, isWorkoutPaused,
    startWorkoutTimer, pauseWorkoutTimer, resetWorkoutTimer,
  } = useTimerContext();

  const [now, setNow] = useState(Date.now());
  const hasStarted = workoutAccumulatedMs > 0 || workoutStartTime !== null;

  useEffect(() => {
    if (!hasStarted) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasStarted]);

  if (!hasStarted) return null;

  const elapsedMs =
    workoutAccumulatedMs +
    (workoutStartTime && !isWorkoutPaused ? now - workoutStartTime : 0);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (totalSeconds >= 3600) {
      const h = Math.floor(totalSeconds / 3600);
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-1 bg-slate-800/60 rounded-full pr-1 pl-3 py-1 border border-slate-700/60">
      <span className="font-mono text-sm font-bold text-cyan-300 w-12 text-center tabular-nums">
        {formatTimer(elapsedSeconds)}
      </span>
      <button
        onClick={isWorkoutPaused ? startWorkoutTimer : pauseWorkoutTimer}
        className="active:scale-90 w-6 h-6 flex items-center justify-center rounded-full bg-slate-700/60 hover:bg-slate-600 text-white transition-all"
        title={isWorkoutPaused ? 'Продолжить' : 'Пауза'}
      >
        {isWorkoutPaused ? <Play className="w-3 h-3 ml-0.5" /> : <Pause className="w-3 h-3" />}
      </button>
      <button
        onClick={resetWorkoutTimer}
        className="active:scale-90 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-all"
        title="Сбросить таймер"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * Compact horizontal calendar strip with built-in month nav.
 *
 * Layout: month label centered above, day pills below with chevrons at the
 * very ends. Saves a whole row vs the previous "header / strip" stack and
 * keeps the prev/next buttons within thumb reach.
 */
function CalendarStrip() {
  const { selectedDate, setSelectedDate } = useUIContext();
  const { dailyDurations } = useWorkoutData();

  const generateDays = (date: Date) =>
    Array.from({ length: 7 }).map((_, i) => addDays(subDays(date, 3), i));
  const [days, setDays] = useState<Date[]>(generateDays(selectedDate));
  useEffect(() => setDays(generateDays(selectedDate)), [selectedDate]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="px-2">
      <div className="text-center text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
        {format(selectedDate, 'LLLL yyyy', { locale: ru })}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 7))}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors flex-shrink-0"
          aria-label="Предыдущая неделя"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex justify-between items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
          {days.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isSelected = dayStr === format(selectedDate, 'yyyy-MM-dd');
            const isToday = dayStr === todayStr;
            const hasWorkout = !!dailyDurations[dayStr];
            const isPast = dayStr < todayStr;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'active:scale-95 flex flex-col items-center justify-center flex-1 min-w-[40px] h-14 rounded-xl transition-all relative',
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(14,165,233,0.18)]'
                    : 'glass-perf text-slate-300 hover:bg-slate-800/50',
                )}
              >
                {isToday && !isSelected && (
                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400" />
                )}
                <span className={cn('text-[10px]', isSelected ? '' : 'opacity-60')}>
                  {format(day, 'EEEEEE', { locale: ru })}
                </span>
                <span className="font-bold text-sm leading-tight">{format(day, 'd')}</span>
                {hasWorkout ? (
                  <div className="w-1 h-1 bg-cyan-400 rounded-full mt-0.5 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
                ) : isPast ? (
                  <div className="w-1 h-1 bg-slate-600 rounded-full mt-0.5" />
                ) : (
                  <div className="w-1 h-1 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors flex-shrink-0"
          aria-label="Следующая неделя"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function FitnessTab() {
  const { viewMode, setViewMode } = useUIContext();
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'constructor' | 'stats'>('tracker');

  return (
    <div className="flex flex-col space-y-3 pb-24">
      <SectionHeader brand="ZTrainer" title="Тренировки" rightSlot={<HeaderControls />} />

      <CalendarStrip />

      {/* Mode Switch (Plan / Diary) */}
      <div className="flex bg-slate-900/50 p-1 rounded-xl glass-perf border border-slate-700/50 mx-2">
        <button
          onClick={() => setViewMode('plan')}
          className={cn(
            'active:scale-95 flex-1 py-1.5 text-sm transition-all rounded-lg',
            viewMode === 'plan'
              ? 'font-bold bg-slate-800 shadow-lg border border-slate-700 text-white'
              : 'font-medium opacity-50 text-slate-200',
          )}
        >
          План
        </button>
        <button
          onClick={() => setViewMode('diary')}
          className={cn(
            'active:scale-95 flex-1 py-1.5 text-sm transition-all rounded-lg',
            viewMode === 'diary'
              ? 'font-bold bg-slate-800 shadow-lg border border-slate-700 text-white'
              : 'font-medium opacity-50 text-slate-200',
          )}
        >
          Дневник
        </button>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 mx-2">
        <button
          onClick={() => setActiveSubTab('tracker')}
          className={cn(
            'active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
            activeSubTab === 'tracker'
              ? 'bg-slate-800 border border-cyan-500/30 text-cyan-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
              : 'bg-slate-900/50 text-slate-400 border border-transparent glass-perf',
          )}
        >
          <Activity className="w-4 h-4" /> Трекер
        </button>
        <button
          onClick={() => setActiveSubTab('constructor')}
          className={cn(
            'active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
            activeSubTab === 'constructor'
              ? 'bg-slate-800 border border-purple-500/30 text-purple-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
              : 'bg-slate-900/50 text-slate-400 border border-transparent glass-perf',
          )}
        >
          <CalendarIcon className="w-4 h-4" /> Билдер
        </button>
        <button
          onClick={() => setActiveSubTab('stats')}
          className={cn(
            'active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
            activeSubTab === 'stats'
              ? 'bg-slate-800 border border-magenta-500/30 text-magenta-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
              : 'bg-slate-900/50 text-slate-400 border border-transparent glass-perf',
          )}
        >
          <PieChart className="w-4 h-4" /> Статы
        </button>
      </div>

      {/* Sub-tab Content */}
      <div className="px-2">
        {activeSubTab === 'tracker' && <WorkoutTracker />}
        {activeSubTab === 'constructor' && <WorkoutConstructor />}
        {activeSubTab === 'stats' && (
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-400 animate-pulse">Загрузка статистики...</p>
              </div>
            }
          >
            <FitnessStats />
          </Suspense>
        )}
      </div>
    </div>
  );
}
