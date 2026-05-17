import { useEffect, useRef, useState } from 'react';
import { X, Search, Trophy, Frown, Loader2, RotateCcw } from 'lucide-react';
import {
  cinemaGuessNew,
  cinemaGuessCheck,
  cinemaGuessReveal,
  BotApiError,
  type NewRiddle,
  type CheckGuessResponse,
} from '@/lib/botApi';

type Phase = 'loading' | 'playing' | 'won' | 'revealed' | 'error';

/**
 * "Угадай фильм" mini-game. The bot generates a spoiler-light riddle from a
 * popular movie, the user types a guess, the bot judges with a fuzzy + AI
 * comparator. The right answer never leaves the server until the user wins
 * or surrenders.
 */
export function GuessGameModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [riddle, setRiddle] = useState<NewRiddle | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<CheckGuessResponse | null>(null);
  const [correctTitle, setCorrectTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const startNew = async (signal?: AbortSignal) => {
    setPhase('loading');
    setRiddle(null);
    setFeedback(null);
    setCorrectTitle(null);
    setError(null);
    setAnswer('');
    setAttempts(0);
    try {
      const r = await cinemaGuessNew(signal);
      setRiddle(r);
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
      setPhase('error');
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    startNew(ac.signal);
    return () => ac.abort();
  }, []);

  const submit = async () => {
    if (!riddle || submitting) return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await cinemaGuessCheck(riddle.riddle_id, trimmed);
      setFeedback(r);
      setAttempts((n) => n + 1);
      if (r.correct) {
        setPhase('won');
        setCorrectTitle(r.correct_title ?? null);
      }
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const reveal = async () => {
    if (!riddle) return;
    try {
      const r = await cinemaGuessReveal(riddle.riddle_id);
      setCorrectTitle(r.correct_title);
      setPhase('revealed');
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-purple-500/30 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              CinemaZ
            </div>
            <h3 className="text-base font-bold text-white">🕵️ Угадай фильм</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {phase === 'loading' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              ИИ загадывает фильм…
            </div>
          )}

          {phase === 'error' && (
            <div>
              <div className="text-red-300/90 text-sm">Ошибка: {error}</div>
              <button onClick={() => startNew()} className="mt-3 active:scale-95 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-purple-500/40 text-xs font-medium transition-all inline-flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Повторить
              </button>
            </div>
          )}

          {(phase === 'playing' || phase === 'won' || phase === 'revealed') && riddle && (
            <>
              <div className="glass rounded-xl border border-slate-700/40 px-4 py-3 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {riddle.riddle}
              </div>

              {phase === 'playing' && (
                <>
                  <div className="mt-3 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                      placeholder="Название фильма…"
                      disabled={submitting}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-24 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={submit}
                      disabled={submitting || !answer.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 active:scale-95 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-200 hover:bg-purple-500/25 disabled:opacity-50 text-xs font-medium transition-all"
                    >
                      {submitting ? '…' : 'Угадать'}
                    </button>
                  </div>

                  {feedback && !feedback.correct && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
                      <Frown className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-200/90">
                        Не угадал. Попробуй ещё раз!
                        <div className="text-[10px] text-red-300/60 mt-0.5">Попыток: {attempts}</div>
                      </div>
                    </div>
                  )}

                  {error && <div className="text-red-300/90 text-xs mt-2">Ошибка: {error}</div>}

                  <div className="mt-4 flex items-center justify-center">
                    <button
                      onClick={reveal}
                      className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
                    >
                      Не могу угадать — показать ответ
                    </button>
                  </div>
                </>
              )}

              {phase === 'won' && (
                <div className="mt-4 flex flex-col items-center text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.35)] mb-3">
                    <Trophy className="w-7 h-7 text-emerald-300" />
                  </div>
                  <h4 className="text-base font-bold text-white">Угадал!</h4>
                  {correctTitle && <p className="text-sm text-slate-300 mt-1">Это был фильм <span className="text-emerald-300 font-bold">{correctTitle}</span></p>}
                  <p className="text-xs text-slate-500 mt-1">Попыток: {attempts}</p>
                  <button
                    onClick={() => startNew()}
                    className="mt-5 active:scale-95 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-sm transition-all"
                  >
                    Ещё одну загадку
                  </button>
                </div>
              )}

              {phase === 'revealed' && (
                <div className="mt-4 flex flex-col items-center text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
                    <Frown className="w-7 h-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Ответ:</h4>
                  {correctTitle && <p className="text-sm text-purple-300 mt-1 font-bold">{correctTitle}</p>}
                  <button
                    onClick={() => startNew()}
                    className="mt-5 active:scale-95 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-sm transition-all"
                  >
                    Попробовать ещё
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
