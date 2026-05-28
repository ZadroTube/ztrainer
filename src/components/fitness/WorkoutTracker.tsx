import { useState, type FC } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useWorkoutData, useTimerContext, useUIContext } from '@/context/AppContext';
import { Check, ChevronDown, ChevronUp, Play, Clock, StopCircle, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutExercise } from '@/types';
import { InlineRestTimer } from './InlineRestTimer';
import { EditWorkoutExerciseModal } from './EditWorkoutExerciseModal';
import { FinishWorkoutModal } from './FinishWorkoutModal';

/**
 * Compact dot-progress for an exercise:
 *   ●●○   (2 done, 1 pending)
 * Shown in the collapsed card so the user can see progress at a glance
 * without expanding.
 */
function SetDots({ total, done }: { total: number; done: number }) {
  if (total <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            i < done
              ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.7)]'
              : 'bg-slate-600/70',
          )}
        />
      ))}
    </div>
  );
}

const ExerciseCard: FC<{ exercise: WorkoutExercise; dateStr: string; isDiaryMode: boolean }> = ({
  exercise, dateStr, isDiaryMode,
}) => {
  const { completedSets, toggleSetCompletion, actualExerciseRests, removeExerciseFromPlan, updatePlanExercise } =
    useWorkoutData();
  const { startRestTimer, restContext } = useTimerContext();

  const isSetCompleted = (setIdx: number) =>
    !!completedSets[`${dateStr}_${exercise.workoutId}_${setIdx}`];

  let completedCount = 0;
  const totalSets = exercise.sets || 1;
  for (let i = 0; i < totalSets; i++) {
    if (isSetCompleted(i)) completedCount++;
  }
  const allComplete = completedCount === totalSets;

  // Auto-collapse completed exercises in plan mode; always expanded in diary view.
  const [expanded, setExpanded] = useState(isDiaryMode ? true : !allComplete);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSetToggle = (setIdx: number) => {
    if (isDiaryMode) return;

    const initiallyCompleted = isSetCompleted(setIdx);
    const willComplete = !initiallyCompleted;
    toggleSetCompletion(dateStr, exercise.workoutId, setIdx, willComplete);

    if (willComplete) {
      let completedAfter = 1;
      for (let i = 0; i < totalSets; i++) {
        if (i !== setIdx && isSetCompleted(i)) completedAfter++;
      }

      if (completedAfter === totalSets) {
        setExpanded(false);
        const exerciseRest = Math.max(exercise.restTimeSeconds || 60, 120);
        startRestTimer(exerciseRest, { type: 'exercise', workoutId: exercise.workoutId });
      } else {
        startRestTimer(exercise.restTimeSeconds || 60, {
          type: 'set',
          workoutId: exercise.workoutId,
          setIndex: setIdx,
        });
      }
    }
  };

  const actualRestForExercise = actualExerciseRests[`${dateStr}_${exercise.workoutId}`];
  // Highlight the next pending set so the user knows where to look.
  const nextPendingIdx = (() => {
    if (isDiaryMode || allComplete) return -1;
    for (let i = 0; i < totalSets; i++) {
      if (!isSetCompleted(i)) return i;
    }
    return -1;
  })();

  return (
    <div
      className={cn(
        'glass-perf rounded-2xl overflow-hidden transition-all duration-300 border-l-4',
        allComplete
          ? 'border-l-cyan-500/50 opacity-70'
          : 'border-l-cyan-500',
      )}
    >
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-bold text-sm transition-colors truncate',
              allComplete ? 'text-slate-400 line-through' : 'text-white',
            )}
          >
            {exercise.name}
          </h3>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
            {exercise.targetMuscleGroup && (
              <span className="truncate">{exercise.targetMuscleGroup}</span>
            )}
            {!isDiaryMode ? (
              <>
                {exercise.targetMuscleGroup && <span className="opacity-40">·</span>}
                <SetDots total={totalSets} done={completedCount} />
                <span className="tabular-nums">
                  {completedCount}/{totalSets}
                </span>
              </>
            ) : (
              <>
                {exercise.targetMuscleGroup && <span className="opacity-40">·</span>}
                <span>{completedCount} выполнено</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {!isDiaryMode && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="active:scale-90 p-1.5 rounded-lg transition-all text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10"
              title="Редактировать"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDelete) {
                removeExerciseFromPlan(dateStr, exercise.workoutId);
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            className={cn(
              'active:scale-90 p-1.5 rounded-lg transition-all',
              confirmDelete
                ? 'text-red-400 bg-red-400/10'
                : 'text-slate-500 hover:text-red-400 hover:bg-red-400/10',
            )}
            title={confirmDelete ? 'Нажмите ещё раз' : 'Удалить'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-transparent space-y-2 animate-in slide-in-from-top-2 fade-in">
          {Array.from({ length: totalSets }).map((_, setIdx) => {
            const isDone = isSetCompleted(setIdx);
            if (isDiaryMode && !isDone) return null;
            const isNext = setIdx === nextPendingIdx;

            return (
              <div key={setIdx} className="flex flex-col gap-1">
                <div
                  onClick={() => handleSetToggle(setIdx)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg transition-all',
                    isDiaryMode
                      ? 'bg-slate-800/30 border border-slate-700/50'
                      : isDone
                        ? 'bg-slate-900/40 cursor-pointer active:scale-[0.98] hover:bg-slate-800/60'
                        : isNext
                          ? 'bg-cyan-500/10 border border-cyan-500/40 cursor-pointer active:scale-[0.98] hover:bg-cyan-500/15'
                          : 'bg-slate-900/40 cursor-pointer active:scale-[0.98] hover:bg-slate-800/60',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs w-6 tabular-nums',
                      isNext ? 'text-cyan-300 font-bold' : 'opacity-50',
                    )}
                  >
                    {setIdx + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs flex-1',
                      isNext ? 'text-cyan-100 font-medium' : 'text-slate-200',
                    )}
                  >
                    {exercise.weightKg ? `${exercise.weightKg} кг × ` : ''}
                    {exercise.isTimeBased
                      ? `${exercise.durationSeconds ? Math.floor(exercise.durationSeconds / 60) : (exercise.reps || 0)} мин`
                      : `${exercise.reps || 0} повторений`}
                  </span>

                  <div
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-all',
                      isDone
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                        : isNext
                          ? 'border-cyan-500/60 bg-transparent text-transparent'
                          : 'border-slate-600 bg-transparent text-transparent',
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </div>
                </div>

                {!isDiaryMode &&
                  restContext?.type === 'set' &&
                  restContext.workoutId === exercise.workoutId &&
                  restContext.setIndex === setIdx && (
                    <div className="px-2 pb-1">
                      <InlineRestTimer />
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {!isDiaryMode &&
        restContext?.type === 'exercise' &&
        restContext.workoutId === exercise.workoutId && (
          <div className="px-4 pb-4">
            <InlineRestTimer />
          </div>
        )}

      {isDiaryMode && actualRestForExercise > 0 && (
        <div className="flex justify-end pr-4 pb-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] bg-slate-800/40 px-2 py-1 rounded-md border border-slate-700/50">
            <Clock className="w-3 h-3" />
            <span>Отдых: {formatDurationSeconds(actualRestForExercise)}</span>
          </div>
        </div>
      )}
      {isEditing && (
        <EditWorkoutExerciseModal
          exercise={exercise}
          onClose={() => setIsEditing(false)}
          onSave={(updates) => {
            updatePlanExercise(dateStr, exercise.workoutId, updates);
          }}
        />
      )}
    </div>
  );
};

function formatDurationSeconds(totalSeconds: number) {
  if (!totalSeconds) return '0с';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}с`;
  return `${minutes}м ${seconds}с`;
}

export function WorkoutTracker({ onGoToPlan }: { onGoToPlan?: () => void } = {}) {
  const { selectedDate, viewMode } = useUIContext();
  const { plannedWorkouts, completedSets, dailyDurations, finishWorkout } = useWorkoutData();
  const { workoutStartTime, workoutAccumulatedMs } = useTimerContext();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const [showFinishModal, setShowFinishModal] = useState(false);

  const todaysPlan = plannedWorkouts[dateStr] || [];
  const isDayFinished = !!dailyDurations[dateStr];

  // In diary mode we only show exercises with at least one completed set,
  // and only for days that actually have history.
  const filteredPlan = todaysPlan.filter((ex) => {
    let count = 0;
    const sets = ex.sets || 1;
    for (let i = 0; i < sets; i++) {
      if (completedSets[`${dateStr}_${ex.workoutId}_${i}`]) count++;
    }
    if (viewMode === 'diary') return count > 0;
    return !isDayFinished;
  });

  // Derived progress for the day (used by the floating finish bar + summary).
  const totalSetsSum = todaysPlan.reduce((acc, ex) => acc + (ex.sets || 1), 0);
  let doneSets = 0;
  for (const ex of todaysPlan) {
    const sets = ex.sets || 1;
    for (let i = 0; i < sets; i++) {
      if (completedSets[`${dateStr}_${ex.workoutId}_${i}`]) doneSets++;
    }
  }
  const progressPct = totalSetsSum > 0 ? Math.round((doneSets / totalSetsSum) * 100) : 0;
  const sessionActive = workoutStartTime !== null || workoutAccumulatedMs > 0;
  const showFinishBar = viewMode === 'plan' && !isDayFinished && sessionActive;

  // Diary view —————————————————————————————————————————————
  if (viewMode === 'diary' && filteredPlan.length > 0) {
    const recordedDuration = dailyDurations[dateStr];

    return (
      <div className="space-y-3 pb-8 animate-in fade-in duration-300">
        <div className="glass-perf rounded-xl p-4 border border-slate-700/50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white capitalize">
              {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
              Сводка за день
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-cyan-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm font-bold tabular-nums">
                {recordedDuration ? formatDurationSeconds(recordedDuration) : '--:--'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase">Длительность</p>
          </div>
        </div>

        {filteredPlan.map((ex) => (
          <ExerciseCard key={ex.workoutId} exercise={ex} dateStr={dateStr} isDiaryMode />
        ))}
      </div>
    );
  }

  // Empty plan ——————————————————————————————————————————————
  if (todaysPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-full glass-perf flex items-center justify-center mb-2">
          <Play className="w-6 h-6 text-slate-500 ml-1" />
        </div>
        <h3 className="text-lg font-bold text-slate-300">План пуст</h3>
        <p className="text-slate-500 text-sm max-w-[260px]">
          На этот день нет тренировок. Добавь упражнения — и вперёд.
        </p>
        {onGoToPlan && (
          <button
            onClick={onGoToPlan}
            className="active:scale-95 mt-2 px-5 py-2.5 bg-purple-500/15 border border-purple-500/40 text-purple-200 hover:bg-purple-500/25 rounded-xl font-medium text-sm transition-all"
          >
            Составить план
          </button>
        )}
      </div>
    );
  }

  // Plan filtered to nothing (everything done OR day is closed) ——————————
  if (filteredPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-full glass-perf border border-cyan-500/50 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <Check className="w-6 h-6 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">
          {viewMode === 'plan'
            ? isDayFinished
              ? 'Тренировка завершена'
              : 'Всё выполнено!'
            : 'Дневник пуст'}
        </h3>
        <p className="text-slate-400 text-sm max-w-[260px]">
          {viewMode === 'plan'
            ? isDayFinished
              ? 'Прогресс сохранён в дневнике.'
              : 'Запланированные упражнения сделаны. Завершить тренировку?'
            : 'Тренировка в этот день не была завершена.'}
        </p>

        {viewMode === 'plan' && !isDayFinished && sessionActive && (
          <button
            onClick={() => setShowFinishModal(true)}
            className="active:scale-95 mt-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all"
          >
            <StopCircle className="w-5 h-5" /> Завершить тренировку
          </button>
        )}

        {viewMode === 'diary' && onGoToPlan && (
          <button
            onClick={onGoToPlan}
            className="active:scale-95 mt-2 px-5 py-2.5 bg-purple-500/15 border border-purple-500/40 text-purple-200 hover:bg-purple-500/25 rounded-xl font-medium text-sm transition-all"
          >
            Открыть план
          </button>
        )}
      </div>
    );
  }

  // Active plan / tracker ————————————————————————————————————
  return (
    <div className="space-y-3 pb-24 animate-in fade-in duration-300">
      {/* Day pulse — single source of truth for daily progress */}
      {viewMode === 'plan' && (
        <div className="glass-perf rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
            <span className="font-bold uppercase tracking-widest">Сегодня</span>
            <span className="tabular-nums text-slate-400">
              {doneSets} / {totalSetsSum} подходов
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {filteredPlan.map((ex) => (
        <ExerciseCard key={ex.workoutId} exercise={ex} dateStr={dateStr} isDiaryMode={false} />
      ))}

      {/* Single sticky finish button when a session is in flight */}
      {showFinishBar && (
        <div className="fixed bottom-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => setShowFinishModal(true)}
            className="pointer-events-auto active:scale-95 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold shadow-[0_8px_30px_rgba(6,182,212,0.45)] flex items-center gap-2 transition-all"
          >
            <StopCircle className="w-4 h-4" /> Завершить и сохранить
          </button>
        </div>
      )}

      {showFinishModal && (
        <FinishWorkoutModal
          onClose={() => setShowFinishModal(false)}
          onSave={(rating, notes) => {
            finishWorkout(rating, notes);
            setShowFinishModal(false);
          }}
        />
      )}
    </div>
  );
}
