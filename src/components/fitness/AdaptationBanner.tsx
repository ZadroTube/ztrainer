import { useState } from 'react';
import { useWorkoutData } from '@/context/AppContext';
import { renderMarkdown } from '@/lib/markdown';
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';

export function AdaptationBanner() {
  const { activeAdaptation, applyAdaptationAction, dismissAdaptationAction } = useWorkoutData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeAdaptation || activeAdaptation.status !== 'pending') {
    return null;
  }

  const { id, explanation, suggested_changes } = activeAdaptation;

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      await applyAdaptationAction(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить изменения');
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setLoading(true);
    setError(null);
    try {
      await dismissAdaptationAction(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отклонить изменения');
      setLoading(false);
    }
  };

  const formatExerciseValues = (vals: { sets: number; reps: number; weight_kg?: number | null }) => {
    const weightStr = vals.weight_kg != null ? ` @ ${vals.weight_kg} кг` : '';
    return `${vals.sets} × ${vals.reps}${weightStr}`;
  };

  return (
    <div className="mx-2 mb-4 glass border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(16,185,129,0.08)] animate-in fade-in slide-in-from-top-3 duration-300 relative">
      {/* Decorative top border glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/10 via-emerald-400 to-cyan-400/20" />
      
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Рекомендация Тренера: Автоадаптация
            </h3>
            <p className="text-[10px] text-emerald-400 font-medium">
              Доступно новое улучшение вашей программы
            </p>
          </div>
        </div>

        {/* Explanation text */}
        <div 
          className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-900 rounded-xl p-3 prose-announcement"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
        />

        {/* Proposed Changes Comparative Table */}
        {suggested_changes && suggested_changes.length > 0 && (
          <div className="bg-slate-950/30 border border-slate-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-3 py-2">Упражнение</th>
                    <th className="px-3 py-2 w-28">Было</th>
                    <th className="px-3 py-2 w-28">Стало</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {suggested_changes.map((change, index) => (
                    <tr key={index} className="hover:bg-slate-900/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-slate-200">
                        {change.exercise_name}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono">
                        {formatExerciseValues(change.old_values)}
                      </td>
                      <td className="px-3 py-2.5 text-emerald-400 font-bold font-mono">
                        {formatExerciseValues(change.new_values)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 active:scale-[0.98] bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Принять рекомендации
          </button>
          
          <button
            onClick={handleDismiss}
            disabled={loading}
            className="active:scale-[0.98] bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:border-transparent disabled:bg-slate-800/40 text-slate-400 hover:text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Отклонить
          </button>
        </div>
      </div>
    </div>
  );
}
