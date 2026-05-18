import { useEffect, useState, lazy, Suspense } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUIContext, useWorkoutData, useTimerContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  Activity, Wrench, PieChart, Play, Pause, RotateCcw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { WorkoutTracker } from '@/components/fitness/WorkoutTracker';
import { WorkoutConstructor } from '@/components/fitness/WorkoutConstructor';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { HelpButton } from '@/components/layout/HelpButton';

const FitnessStats = lazy(() =>
  import('@/components/fitness/FitnessStats').then((m) => ({ default: m.FitnessStats })),
);

const FITNESS_HELP = `# 💪 Раздел «Тренировки»

Здесь ты планируешь и отслеживаешь свои тренировки.

## Как устроено

- **Календарь** вверху — листай дни стрелками. Точки под датами показывают, где есть план.
- **Три вкладки**: Сегодня · План · Прогресс.

## Сегодня

Показывает упражнения на выбранный день. Нажимай на подход (сет), чтобы отметить его выполненным. Когда все подходы сделаны — упражнение закрашивается.

## План

Здесь ты собираешь тренировку:
- Нажми **+** чтобы добавить упражнение из базы.
- Задай количество подходов и повторений.
- Упражнения можно удалять свайпом или через меню.

## Прогресс

Графики и статистика: объём за неделю, частота тренировок, рекорды.

## Таймер

Вверху справа — таймер тренировки. Запускается автоматически при первом отмеченном подходе. Можно поставить на паузу или сбросить.

> Данные синхронизируются между устройствами в реальном времени.
`;

/**
 * Header pill: live workout timer with pause/reset.
 * Quiet visual style — no glow halos, just a small monospace pill.
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

type SubTab = 'today' | 'plan' | 'progress';

/**
 * Top-level Fitness tab.
 *
 * After iteration 2 there are 3 sub-tabs:
 *   - Сегодня:  active tracker. Auto-switches to diary view if the day is in
 *               the past or already finished. The legacy "План/Дневник" toggle
 *               is gone — the mode is implicit.
 *   - План:     full builder (manage exercises + plan the day).
 *   - Прогресс: stats.
 *
 * The implicit mode is exposed to WorkoutTracker via `viewMode` in context;
 * we set it here based on the selected date and `dailyDurations`.
 */
export function FitnessTab() {
  const { selectedDate, setViewMode } = useUIContext();
  const { dailyDurations } = useWorkoutData();
  const [subTab, setSubTab] = useState<SubTab>('today');

  // Implicit mode: future/today empty → plan; today closed or past with history → diary.
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isPast = dateStr < todayStr;
  const isFinished = !!dailyDurations[dateStr];
  const inferredMode: 'plan' | 'diary' = (isPast || isFinished) ? 'diary' : 'plan';
  useEffect(() => {
    setViewMode(inferredMode);
  }, [inferredMode, setViewMode]);

  return (
    <div className="flex flex-col space-y-3 pb-24">
      <SectionHeader brand="ZTrainer" title="Тренировки" rightSlot={
        <div className="flex items-center gap-2">
          <HeaderControls />
          <HelpButton brand="ZTrainer" accent="cyan" content={FITNESS_HELP} />
        </div>
      } />

      <CalendarStrip />

      {/* Top-level subtabs — single source of navigation */}
      <div className="flex gap-2 mx-2">
        <SubTabButton
          active={subTab === 'today'}
          onClick={() => setSubTab('today')}
          icon={<Activity className="w-4 h-4" />}
          label="Сегодня"
          accent="cyan"
        />
        <SubTabButton
          active={subTab === 'plan'}
          onClick={() => setSubTab('plan')}
          icon={<Wrench className="w-4 h-4" />}
          label="План"
          accent="purple"
        />
        <SubTabButton
          active={subTab === 'progress'}
          onClick={() => setSubTab('progress')}
          icon={<PieChart className="w-4 h-4" />}
          label="Прогресс"
          accent="magenta"
        />
      </div>

      <div className="px-2">
        {subTab === 'today' && <WorkoutTracker onGoToPlan={() => setSubTab('plan')} />}
        {subTab === 'plan' && <WorkoutConstructor />}
        {subTab === 'progress' && (
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

function SubTabButton({
  active, onClick, icon, label, accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: 'cyan' | 'purple' | 'magenta';
}) {
  const accentClass =
    accent === 'cyan'
      ? 'border-cyan-500/30 text-cyan-300'
      : accent === 'purple'
        ? 'border-purple-500/30 text-purple-300'
        : 'border-magenta-500/30 text-magenta-300';
  return (
    <button
      onClick={onClick}
      className={cn(
        'active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm',
        active
          ? `bg-slate-800 border ${accentClass} shadow-[0_4px_10px_rgba(0,0,0,0.5)]`
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass-perf',
      )}
    >
      {icon} {label}
    </button>
  );
}
