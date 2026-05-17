import { useState } from 'react';
import { Wand2, Loader2, Check } from 'lucide-react';
import { cinemaBackfill, BotApiError } from '@/lib/botApi';

interface BackfillBannerProps {
  /** How many movies in the user's library are missing tmdb_id (and thus AI features). */
  missingCount: number;
  /** Called after a successful backfill so the parent can refetch lists. */
  onDone: () => void;
}

/**
 * Small banner shown at the top of the watchlist / watched lists when the
 * user has movies imported from Notion (or otherwise missing TMDB metadata).
 * One tap fires off the server-side backfill and the user sees the result count.
 */
export function BackfillBanner({ missingCount, onDone }: BackfillBannerProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ updated: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await cinemaBackfill();
      setResult({ updated: r.updated, failed: r.failed.length });
      if (r.updated > 0) {
        onDone();
      }
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (result && missingCount === 0) {
    // Library fully enriched — show a brief success state then disappear via parent re-render.
    return (
      <div className="glass rounded-xl border border-emerald-500/30 px-3 py-2 mb-3 flex items-center gap-2">
        <Check className="w-4 h-4 text-emerald-300 flex-shrink-0" />
        <p className="text-xs text-emerald-200">
          Дозаполнено {result.updated} {pluralize(result.updated, 'фильм', 'фильма', 'фильмов')}
          {result.failed > 0 && `, ${result.failed} не нашлось в TMDB`}.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-cyan-500/30 px-3 py-2.5 mb-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Wand2 className="w-4 h-4 text-cyan-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white">
          {missingCount} {pluralize(missingCount, 'фильм', 'фильма', 'фильмов')} без деталей TMDB
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Дозаполню постеры, описания, трейлеры. После — будет работать «Объяснить фильм».
        </p>
        {error && <p className="text-[11px] text-red-300/90 mt-1">{error}</p>}
      </div>
      <button
        onClick={run}
        disabled={running}
        className="active:scale-95 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {running ? 'Идёт…' : 'Дозаполнить'}
      </button>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
