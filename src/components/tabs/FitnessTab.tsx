import { useEffect, useState, lazy, Suspense } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import { Activity, Calendar as CalendarIcon, PieChart, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutTracker } from '../fitness/WorkoutTracker';
import { WorkoutConstructor } from '../fitness/WorkoutConstructor';

const FitnessStats = lazy(() => import('../fitness/FitnessStats').then(m => ({ default: m.FitnessStats })));

function HeaderControls() {
  const { 
    workoutStartTime, workoutAccumulatedMs, isWorkoutPaused, 
    startWorkoutTimer, pauseWorkoutTimer, resetWorkoutTimer 
  } = useAppContext();
  
  const [now, setNow] = useState(Date.now());
  const [sysTimeStr, setSysTimeStr] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setSysTimeStr(format(new Date(), 'HH:mm'));
    }, 1000);
    // Init immediately
    setSysTimeStr(format(new Date(), 'HH:mm'));
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = workoutAccumulatedMs + (workoutStartTime && !isWorkoutPaused ? (now - workoutStartTime) : 0);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  const hasStarted = elapsedMs > 0 || workoutStartTime !== null;

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    // If hours > 0
    if (totalSeconds >= 3600) {
      const h = Math.floor(totalSeconds / 3600);
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-3">
      {hasStarted && (
        <div className="flex items-center gap-2 bg-slate-800/80 rounded-full pr-1 pl-3 py-1 border border-cyan-500/30">
          <span className="font-mono text-sm font-bold text-cyan-400 w-12 text-center">
            {formatTimer(elapsedSeconds)}
          </span>
          <button 
            onClick={isWorkoutPaused ? startWorkoutTimer : pauseWorkoutTimer}
            className="active:scale-90 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700/50 hover:bg-slate-600 text-white transition-all"
          >
            {isWorkoutPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={resetWorkoutTimer}
            className="active:scale-90 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/20 text-red-400 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="text-sm font-bold text-slate-300 font-mono tracking-wider ml-1">
        {sysTimeStr}
      </div>
    </div>
  );
}

export function FitnessTab() {
  const { selectedDate, setSelectedDate, viewMode, setViewMode, dailyDurations } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'constructor' | 'stats'>('tracker');
  
  // horizontal calendar
  const generateDays = (date: Date) => {
    return Array.from({ length: 7 }).map((_, i) => addDays(subDays(date, 3), i));
  };
  
  const [days, setDays] = useState<Date[]>(generateDays(selectedDate));
  
  useEffect(() => {
    setDays(generateDays(selectedDate));
  }, [selectedDate]);

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* Header & View Mode Switch */}
      <header className="px-2 pt-6 pb-2 flex justify-between items-center flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-xs bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">ZTrainer</span>
          <h1 className="text-xl font-bold text-white">Тренировки</h1>
        </div>
        
        <HeaderControls />
      </header>

      {/* Calendar Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 7))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          {format(selectedDate, 'LLLL yyyy', { locale: ru })}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Strip - Glass Style */}
      <div className="flex justify-start items-center bg-transparent px-2 pt-2 pb-4 overflow-x-auto gap-2 md:gap-3 no-scrollbar rounded-none border-none flex-shrink-0 min-h-[90px]">
        {days.map((day, idx) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const isSelected = dayStr === format(selectedDate, 'yyyy-MM-dd');
          const hasWorkout = !!dailyDurations[dayStr];
          const isPast = dayStr < todayStr;
          
          return (
            <button 
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "active:scale-95 flex flex-col items-center justify-center flex-shrink-0 min-w-[55px] md:min-w-[70px] h-16 rounded-2xl transition-all",
                isSelected 
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]" 
                  : "glass text-slate-300 hover:bg-slate-800/50"
              )}
            >
              <span className={cn("text-[10px] md:text-xs", isSelected ? "" : "opacity-60")}>
                {format(day, 'EEEEEE', { locale: ru })}
              </span>
              <span className="font-bold text-sm md:text-base">
                {format(day, 'd')}
              </span>
              <div className="h-2 w-full flex justify-center mt-0.5">
                {hasWorkout ? (
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                ) : isPast ? (
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Mode Switch (Plan / Diary) */}
      <div className="flex bg-slate-900/50 p-1 rounded-xl glass border border-slate-700/50 mx-2">
        <button 
          onClick={() => setViewMode('plan')}
          className={cn(
            "active:scale-95 flex-1 py-1.5 text-sm transition-all rounded-lg",
            viewMode === 'plan' 
              ? "font-bold bg-slate-800 shadow-lg border border-slate-700 text-white" 
              : "font-medium opacity-50 text-slate-200"
          )}
        >
          План
        </button>
        <button 
          onClick={() => setViewMode('diary')}
          className={cn(
            "active:scale-95 flex-1 py-1.5 text-sm transition-all rounded-lg",
            viewMode === 'diary' 
              ? "font-bold bg-slate-800 shadow-lg border border-slate-700 text-white" 
              : "font-medium opacity-50 text-slate-200"
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
            "active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm",
            activeSubTab === 'tracker'
              ? "bg-slate-800 border border-cyan-500/30 text-cyan-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              : "bg-slate-900/50 text-slate-400 border border-transparent glass"
          )}
        >
          <Activity className="w-4 h-4" /> Трекер
        </button>
        <button
          onClick={() => setActiveSubTab('constructor')}
          className={cn(
            "active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm",
            activeSubTab === 'constructor'
              ? "bg-slate-800 border border-purple-500/30 text-purple-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              : "bg-slate-900/50 text-slate-400 border border-transparent glass"
          )}
        >
          <CalendarIcon className="w-4 h-4" /> Билдер
        </button>
        <button
          onClick={() => setActiveSubTab('stats')}
          className={cn(
            "active:scale-95 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm",
            activeSubTab === 'stats'
              ? "bg-slate-800 border border-magenta-500/30 text-magenta-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              : "bg-slate-900/50 text-slate-400 border border-transparent glass"
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
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400 animate-pulse">Загрузка статистики...</p>
            </div>
          }>
            <FitnessStats />
          </Suspense>
        )}
      </div>
      
    </div>
  );
}
