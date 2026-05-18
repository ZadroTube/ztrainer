import { useEffect, useState } from 'react';
import { X, BookOpen, KeyRound, AlertTriangle } from 'lucide-react';
import { cinemaExplain, BotApiError, type ExplainMode } from '@/lib/botApi';

interface ExplainModalProps {
  tmdbId: number;
  title: string;
  initialMode?: ExplainMode;
  onClose: () => void;
}

/**
 * AI-explanation modal for movies. Two modes:
 *   - plot:   detailed plot retell (no ending spoilers)
 *   - ending: meaning of the ending (⚠ spoilers)
 *
 * Each mode caches its result in component state so toggling between modes
 * doesn't re-fetch.
 */
export function ExplainModal({ tmdbId, title, initialMode = 'plot', onClose }: ExplainModalProps) {
  const [mode, setMode] = useState<ExplainMode>(initialMode);
  const [results, setResults] = useState<Partial<Record<ExplainMode, string>>>({});
  const [loadingMode, setLoadingMode] = useState<ExplainMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (results[mode] !== undefined) return;
    const ac = new AbortController();
    setLoadingMode(mode);
    setError(null);
    cinemaExplain(tmdbId, mode, ac.signal)
      .then((r) => setResults((prev) => ({ ...prev, [mode]: r.text })))
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingMode(null);
      });
    return () => ac.abort();
  }, [mode, tmdbId, results]);

  const text = results[mode];
  const loading = loadingMode === mode;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-purple-500/30 modal-sheet-tall overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              CinemaZ
            </div>
            <h3 className="text-base font-bold text-white truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="ml-3 active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-3 pt-3 flex gap-2">
          <ModeTab
            active={mode === 'plot'}
            onClick={() => setMode('plot')}
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Сюжет"
          />
          <ModeTab
            active={mode === 'ending'}
            onClick={() => setMode('ending')}
            icon={<KeyRound className="w-3.5 h-3.5" />}
            label="Концовка"
            danger
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {mode === 'ending' && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200/90 leading-snug">
                Дальше — спойлеры концовки. Не читай если ещё не смотрел.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
              <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
              {mode === 'plot' ? 'ИИ перечитывает сценарий…' : 'ИИ ищет смысл концовки…'}
            </div>
          )}

          {error && !loading && (
            <div className="text-red-300/90 text-sm">Ошибка: {error}</div>
          )}

          {!loading && text && (
            <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {/* The bot adds its own header with title; we already show it above — strip the duplicate. */}
              {stripDuplicateHeader(text, title)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  const activeClass = danger
    ? 'bg-slate-800 border border-red-500/30 text-red-300'
    : 'bg-slate-800 border border-purple-500/30 text-purple-300';
  return (
    <button
      onClick={onClick}
      className={`active:scale-95 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
        active
          ? `${activeClass} shadow-[0_4px_10px_rgba(0,0,0,0.5)]`
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass-solid'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * The bot's `explain_movie` prepends a markdown header with the movie title
 * + section name. We render our own header in the modal, so trim that to
 * avoid duplication. Falls back to the raw text if no recognizable header.
 */
function stripDuplicateHeader(text: string, title: string): string {
  if (!text.includes(title)) return text.trim();
  // Strip first 1-3 lines if they contain the title or section name.
  const lines = text.split('\n');
  let cut = 0;
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const l = lines[i];
    if (l.includes(title) || l.includes('Подробный сюжет') || l.includes('Объяснение концовки') || l.trim() === '') {
      cut = i + 1;
    } else {
      break;
    }
  }
  return lines.slice(cut).join('\n').trim();
}
