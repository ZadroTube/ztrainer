import { useEffect, useState } from 'react';
import { fetchTarot, pullTarot, BotApiError, type TarotResponse } from '@/lib/botApi';
import { X, Sparkles } from 'lucide-react';

/**
 * Tarot card-of-the-day modal. On open it checks today's cached card via
 * GET /api/tarot. If the user hasn't pulled yet, shows a "Вытянуть карту"
 * button that POSTs and renders the result.
 */
export function TarotModal({ onClose }: { onClose: () => void }) {
  const [card, setCard] = useState<TarotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchTarot(ac.signal)
      .then(setCard)
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const handlePull = async () => {
    setPulling(true);
    setError(null);
    try {
      const result = await pullTarot();
      setCard(result);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-magenta-500/30 modal-sheet overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">Карта дня</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-5 overflow-y-auto custom-scrollbar text-sm text-slate-200">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-magenta-500/30 border-t-magenta-400 rounded-full animate-spin" />
              Заглядываю в колоду…
            </div>
          )}

          {!loading && card && card.cached && card.text && (
            <div className="space-y-3">
              {card.card_name && (
                <div className="text-xs uppercase tracking-widest text-magenta-300/90 font-bold">
                  🃏 {card.card_name}
                </div>
              )}
              <p className="whitespace-pre-line">{card.text}</p>
              <p className="text-xs text-slate-500 mt-4">Карты устают. Возвращайся завтра 🔮</p>
            </div>
          )}

          {!loading && card && !card.cached && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-32 rounded-2xl bg-gradient-to-b from-purple-600 to-magenta-600 border border-magenta-400/40 shadow-[0_0_30px_rgba(217,70,239,0.35)] flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-300 mb-4">Колода ждёт. Готов(а) узнать, какой настрой у твоего дня?</p>
              <button
                onClick={handlePull}
                disabled={pulling}
                className="active:scale-95 px-6 py-3 bg-gradient-to-r from-magenta-500 to-purple-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(217,70,239,0.35)] disabled:opacity-50 transition-all"
              >
                {pulling ? 'Тасую колоду…' : 'Вытянуть карту'}
              </button>
            </div>
          )}

          {error && (
            <div className="text-red-300/90 mt-3 text-xs">Ошибка: {error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
