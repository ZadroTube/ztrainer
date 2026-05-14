import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { Check, ChevronDown, ChevronUp, Play, Clock, StopCircle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WorkoutExercise } from '../../types';
import { InlineRestTimer } from './InlineRestTimer';

const ExerciseCard: React.FC<{ exercise: WorkoutExercise, index: number, dateStr: string, isDiaryMode: boolean }> = ({ exercise, index, dateStr, isDiaryMode }) => {
  const [expanded, setExpanded] = useState(!isDiaryMode);
  const { completedSets, toggleSetCompletion, startRestTimer, restContext, removeExerciseFromPlan, actualExerciseRests } = useAppContext();

  // Helper to check if a specific set is done
  const isSetCompleted = (setIdx: number) => {
    return !!completedSets[`${dateStr}_${exercise.workoutId}_${setIdx}`];
  };

  const handleSetToggle = (setIdx: number) => {
    if (isDiaryMode) return; // Cannot edit history directly from here

    const initiallyCompleted = isSetCompleted(setIdx);
    const willComplete = !initiallyCompleted;
    
    toggleSetCompletion(dateStr, exercise.workoutId, setIdx, willComplete);

    // Smart Timers logic
    if (willComplete) {
      const totalSets = exercise.sets;
      let completedCountAfterThis = 1; // including this one
      
      for (let i = 0; i < totalSets; i++) {
        if (i !== setIdx && isSetCompleted(i)) {
          completedCountAfterThis++;
        }
      }

      if (completedCountAfterThis === totalSets) {
        // Last set completed -> rest between different exercises 
        setExpanded(false);
        startRestTimer(180, { type: 'exercise', workoutId: exercise.workoutId });
      } else {
        // Rest between sets of same exercise
        startRestTimer(exercise.restTimeSeconds || 60, { type: 'set', workoutId: exercise.workoutId, setIndex: setIdx });
      }
    }
  };

  const totalSets = exercise.sets;
  let completedCount = 0;
  for (let i = 0; i < totalSets; i++) {
     if (isSetCompleted(i)) completedCount++;
  }
  
  const allComplete = completedCount === totalSets;
  const actualRestForExercise = actualExerciseRests[`${dateStr}_${exercise.workoutId}`];

  return (
    <div className={cn(
      "glass rounded-2xl overflow-hidden transition-all duration-300 border-l-4",
      allComplete 
        ? "border-l-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] opacity-60" 
        : "border-l-cyan-500",
      !expanded && allComplete ? "opacity-60" : ""
    )}>
      <div 
        className={cn("p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 transition-colors select-none", isDiaryMode ? "opacity-100" : "")}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className={cn(
              "font-bold text-sm transition-colors",
              allComplete ? "text-slate-400 line-through" : "text-white"
            )}>
              {exercise.name}
            </h3>
            <div className="text-[10px] text-slate-400 mt-0.5 flex gap-1">
              {exercise.targetMuscleGroup && (
                <span>{exercise.targetMuscleGroup} • </span>
              )}
              <span>{isDiaryMode ? completedCount : exercise.sets} {isDiaryMode ? 'выполнено' : 'подхода'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); removeExerciseFromPlan(dateStr, exercise.workoutId); }}
            className="active:scale-90 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="text-cyan-400 flex items-center gap-2">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-transparent space-y-2 animate-in slide-in-from-top-2 fade-in">
          {Array.from({ length: totalSets }).map((_, setIdx) => {
            const isDone = isSetCompleted(setIdx);
            if (isDiaryMode && !isDone) return null; // In diary mode, only show completed sets
            
            return (
              <div key={setIdx} className="flex flex-col gap-1">
                <div 
                  onClick={() => handleSetToggle(setIdx)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg transition-all",
                    isDiaryMode ? "bg-slate-800/30 border border-slate-700/50" : "bg-slate-900/40 cursor-pointer active:scale-[0.98] hover:bg-slate-800/60"
                  )}
                >
                  <span className="text-xs w-8 opacity-50">{setIdx + 1}</span>
                  <span className="text-xs flex-1 text-slate-200">
                    {exercise.weightKg ? `${exercise.weightKg} кг × ` : ''}{exercise.reps} повторений
                  </span>
                  
                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-all",
                    isDone 
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-400" 
                      : "border-slate-600 bg-transparent text-transparent"
                  )}>
                    <Check className="w-3 h-3" />
                  </div>
                </div>
                
                {/* Show inline rest timer below the set if it's the active rest */}
                {!isDiaryMode && restContext?.type === 'set' && restContext.workoutId === exercise.workoutId && restContext.setIndex === setIdx && (
                  <div className="px-2 pb-2">
                    <InlineRestTimer />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Show inline rest timer below the exercise if it's the active rest */}
      {!isDiaryMode && restContext?.type === 'exercise' && restContext.workoutId === exercise.workoutId && (
        <div className="px-4 pb-4">
          <InlineRestTimer />
        </div>
      )}

      {/* Show actual recorded rest time in diary view */}
      {isDiaryMode && actualRestForExercise > 0 && (
        <div className="flex justify-end pr-4 pb-4">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-800/40 px-2 py-1 rounded-md border border-slate-700/50">
            <Clock className="w-3.5 h-3.5" /> 
            <span>Отдых после упражнения: {formatDurationSeconds(actualRestForExercise)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDurationSeconds(totalSeconds: number) {
  if (!totalSeconds) return '0с';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}с`;
  return `${minutes}м ${seconds}с`;
}

export function WorkoutTracker() {
  const { selectedDate, plannedWorkouts, viewMode, completedSets, dailyDurations, workoutStartTime, workoutAccumulatedMs, finishWorkout } = useAppContext();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const todaysPlan = plannedWorkouts[dateStr] || [];

  const isDayFinished = !!dailyDurations[dateStr];
  
  // Filter based on viewMode
  const filteredPlan = todaysPlan.filter(ex => {
    let completedCount = 0;
    for (let i = 0; i < ex.sets; i++) {
       if (completedSets[`${dateStr}_${ex.workoutId}_${i}`]) completedCount++;
    }
    
    if (viewMode === 'diary') {
      // Show in diary only if day is finished, and we did at least 1 set
      return isDayFinished && completedCount > 0;
    }
    
    // In plan mode, show everything if day is NOT finished
    return !isDayFinished;
  });

  if (viewMode === 'diary' && filteredPlan.length > 0) {
    const recordedDuration = dailyDurations[dateStr];
    
    return (
      <div className="space-y-4 pb-8 animate-in fade-in duration-300">
        <div className="glass rounded-xl p-4 border border-slate-700/50 flex justify-between items-center bg-slate-800/20">
          <div>
            <h3 className="text-sm font-bold text-white capitalize">{format(selectedDate, 'EEEE, d MMMM', { locale: ru })}</h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
              Сводка за день
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-cyan-400">
               <Clock className="w-4 h-4" />
               <span className="font-mono text-sm font-bold">{recordedDuration ? formatDurationSeconds(recordedDuration) : '--:--'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase">Длительность</p>
          </div>
        </div>

        {filteredPlan.map((ex, idx) => (
          <ExerciseCard 
            key={ex.workoutId} 
            exercise={ex} 
            index={idx}
            dateStr={dateStr}
            isDiaryMode={true}
          />
        ))}
      </div>
    );
  }

  if (todaysPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-2">
          <Play className="w-6 h-6 text-slate-500 ml-1" />
        </div>
        <h3 className="text-lg font-bold text-slate-300">План пуст</h3>
        <p className="text-slate-500 text-sm max-w-[250px]">
          В расписании на этот день пусто. Перейдите во вкладку "Construct", чтобы составить план.
        </p>
      </div>
    );
  }

  if (filteredPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-full glass border border-cyan-500/50 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <Check className="w-6 h-6 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">
          {viewMode === 'plan' ? (isDayFinished ? 'Тренировка завершена!' : 'Всё выполнено!') : 'Дневник пуст'}
        </h3>
        <p className="text-slate-400 text-sm max-w-[250px]">
          {viewMode === 'plan' 
            ? (isDayFinished ? 'Прогресс сохранен в дневник.' : 'Вы закончили все запланированные упражнения на сегодня. Так держать!') 
            : 'Вы еще не завершили тренировку в этот день.'}
        </p>

        {viewMode === 'plan' && !isDayFinished && (workoutStartTime || workoutAccumulatedMs > 0) && (
          <button 
            onClick={finishWorkout}
            className="active:scale-95 mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all"
          >
             <StopCircle className="w-5 h-5" /> Завершить тренировку и внести в Дневник
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-300">
      
      {viewMode === 'plan' && (workoutStartTime || workoutAccumulatedMs > 0) && !isDayFinished && (
        <div className="flex justify-end mb-2">
           <button 
            onClick={finishWorkout}
            className="active:scale-95 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-400/20 flex items-center gap-2 transition-all shadow-md"
          >
             <StopCircle className="w-4 h-4" /> Завершить и сохранить
          </button>
        </div>
      )}

      {filteredPlan.map((ex, idx) => (
        <div key={ex.workoutId} className="space-y-4">
          <ExerciseCard 
            exercise={ex} 
            index={idx}
            dateStr={dateStr}
            isDiaryMode={false}
          />
        </div>
      ))}

      {viewMode === 'plan' && !isDayFinished && (workoutStartTime || workoutAccumulatedMs > 0) && (
        <button 
          onClick={finishWorkout}
          className="active:scale-95 w-full mt-8 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] flex justify-center items-center gap-2 transition-all"
        >
           <StopCircle className="w-5 h-5" /> Завершить тренировку и внести в Дневник
        </button>
      )}
    </div>
  );
}
