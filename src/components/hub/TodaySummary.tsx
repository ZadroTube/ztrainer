import { useEffect, useState } from 'react';
import { fetchToday, type TodayResponse } from '@/lib/botApi';
import { Dumbbell, Sparkles } from 'lucide-react';
import { useUIContext } from '@/context/AppContext';

/**
 * Compact "today" widget. Shows whether the user has a workout planned for
 * today and what muscle group it targets, plus zodiac status.
 */
export function TodaySummary() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveTab } = useUIContext();

  useEffect(() => {
    const ac = new AbortController();
    fetchToday(ac.signal)
      .then(setData)
      .catch(() => {/* silent — non-blocking widget */})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3 opacity-60">
        <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <span className="text-xs text-slate-400">Собираю сводку…</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setActiveTab('fitness')}
        className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.98] hover:bg-slate-800/40 transition-all text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Сегодня
          </div>
          <div className="text-sm font-bold text-white truncate">
            {data.workout_theme ? `Тренировка: ${data.workout_theme}` : 'Тренировок сегодня нет'}
          </div>
        </div>
      </button>
    </div>
  );
}
