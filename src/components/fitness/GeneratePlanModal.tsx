import { useState, useEffect } from 'react';
import { generatePlan, applyPlan, AIPlanExercise, GeneratePlanResponse } from '@/lib/botApi';
import { X, Sparkles, Calendar, Play, Check, ChevronLeft, ChevronRight, RefreshCw, Edit, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GeneratePlanModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TIPS = [
  "ИИ подбирает упражнения с учётом вашего инвентаря и места тренировок.",
  "Наш ИИ учитывает историю ваших прошлых занятий для прогрессии нагрузок.",
  "Качественный отдых между подходами важен так же, как и само упражнение.",
  "Регулярные замеры веса и тела помогают ИИ точнее адаптировать нагрузку.",
  "Не бойтесь менять сгенерированный план вручную, если упражнение слишком сложное."
];

export function GeneratePlanModal({ onClose, onSuccess }: GeneratePlanModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [startDate, setStartDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Plan results
  const [planResult, setPlanResult] = useState<GeneratePlanResponse | null>(null);
  const [activeDateIndex, setActiveDateIndex] = useState(0);

  // Rotate tips during loading
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    setStep(2);
    setLoading(true);
    setError(null);
    try {
      const res = await generatePlan(period, startDate);
      if (res && res.plan && Object.keys(res.plan).length > 0) {
        setPlanResult(res);
        setStep(3);
      } else {
        setError("ИИ вернул пустой план. Попробуйте еще раз.");
        setStep(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сгенерировать план. Проверьте соединение.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!planResult) return;
    setApplying(true);
    setError(null);
    try {
      const res = await applyPlan(planResult.plan);
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError("Ошибка при сохранении плана в базу данных.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить план.");
    } finally {
      setApplying(false);
    }
  };

  const planDates = planResult ? Object.keys(planResult.plan).sort() : [];
  const activeDate = planDates[activeDateIndex];
  const activeExercises = activeDate && planResult ? planResult.plan[activeDate] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/20 max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-base font-bold text-white">ИИ-генератор планов</h3>
          </div>
          {step !== 2 && (
            <button 
              onClick={onClose} 
              className="active:scale-90 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
            </button>
          )}
        </header>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-between">
          
          {/* STEP 1: Settings */}
          {step === 1 && (
            <div className="space-y-5 flex-1">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-200">Выберите период планирования:</h4>
                <p className="text-xs text-slate-400">ИИ составит сбалансированную программу нагрузок</p>
              </div>

              {/* Period Select Toggle */}
              <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-850">
                {(['day', 'week', 'month'] as const).map((p) => {
                  const label = p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц';
                  const isSelected = period === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                        isSelected 
                          ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-[0_2px_8px_rgba(6,182,212,0.15)]"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Дата начала плана:
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex gap-2.5 items-start">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-6">
                <button
                  onClick={handleGenerate}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-[0_4px_14px_rgba(6,182,212,0.25)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Сгенерировать план
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Loading animation */}
          {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Neon spinning outer ring */}
                <div className="w-20 h-20 border-4 border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin" />
                {/* Glow ring */}
                <div className="absolute w-20 h-20 border border-cyan-400 rounded-full blur-[4px] animate-pulse" />
                <Sparkles className="absolute w-8 h-8 text-cyan-400 animate-bounce" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">🤖 Тренер составляет ваш план...</h4>
                <p className="text-xs text-slate-400">Это займет около 10–15 секунд</p>
              </div>

              {/* Fun/useful fitness tips */}
              <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 min-h-[96px] flex items-center justify-center transition-all duration-500">
                <p className="text-xs text-center text-slate-300 italic leading-relaxed animate-fade-in">
                  "{TIPS[tipIndex]}"
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Apply */}
          {step === 3 && planResult && (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              {/* Summary / AI Insights */}
              <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-3.5 space-y-1.5">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Резюме тренера
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {planResult.summary}
                </p>
              </div>

              {/* Day selection strip */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Расписание дней:</h4>
                  <span className="text-[10px] font-bold text-slate-500">Всего дней: {planDates.length}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={activeDateIndex === 0}
                    onClick={() => setActiveDateIndex(prev => prev - 1)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar py-1">
                    {planDates.map((dateStr, idx) => {
                      const isSelected = idx === activeDateIndex;
                      const hasWorkouts = planResult.plan[dateStr].length > 0;
                      const d = new Date(dateStr);
                      const dayName = format(d, 'EEEEEE', { locale: ru });
                      const dayNum = format(d, 'd');

                      return (
                        <button
                          key={dateStr}
                          onClick={() => setActiveDateIndex(idx)}
                          className={cn(
                            "flex flex-col items-center justify-center w-11 h-12 rounded-xl transition-all border shrink-0",
                            isSelected 
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                              : "bg-slate-900/40 border-slate-850 hover:border-slate-800 text-slate-400"
                          )}
                        >
                          <span className="text-[9px] leading-tight opacity-60 uppercase">{dayName}</span>
                          <span className="text-xs font-bold leading-tight mt-0.5">{dayNum}</span>
                          {hasWorkouts && (
                            <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={activeDateIndex === planDates.length - 1}
                    onClick={() => setActiveDateIndex(prev => prev + 1)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Workouts detail for selected day */}
              <div className="flex-1 border border-slate-850 bg-slate-900/25 rounded-2xl p-3 min-h-[140px] max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-850 pb-1.5 flex justify-between">
                  <span>{format(new Date(activeDate), 'd MMMM, eeee', { locale: ru })}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {activeExercises.length > 0 ? "Тренировка" : "День отдыха"}
                  </span>
                </div>

                {activeExercises.length === 0 ? (
                  <div className="h-[100px] flex items-center justify-center text-xs text-slate-500 italic">
                    Запланирован день отдыха и восстановления 🧘‍♀️
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeExercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-xl border border-slate-850">
                        <div className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{ex.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {ex.muscle_group || ex.target_muscle_group || 'Общая'} · {ex.sets}п × {ex.reps}р
                            {ex.weight_kg ? ` · ${ex.weight_kg} кг` : ''}
                            {ex.rest_seconds ? ` · Отдых ${ex.rest_seconds}с` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-850">
                <button
                  onClick={handleGenerate}
                  className="py-3 px-3 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 bg-slate-900/30"
                  title="Перегенерировать план"
                >
                  <RefreshCw className="w-4 h-4" />
                  Пересоздать
                </button>
                
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="py-3 px-6 rounded-xl font-bold text-sm bg-cyan-500 text-white shadow-[0_4px_12px_rgba(6,182,212,0.25)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-1 disabled:opacity-50"
                >
                  {applying ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Применить
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
