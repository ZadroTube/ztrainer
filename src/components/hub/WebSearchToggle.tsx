import { useEffect, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import {
  fetchPreferences,
  updatePreferences,
  BotApiError,
} from '@/lib/botApi';

/**
 * Per-user toggle to let the chat AI run a Tavily web search when the
 * user's message contains trigger words (e.g. "сегодня", "найди",
 * "курс"). Stored in `users.web_search_enabled`. Defaults to false —
 * users opt-in here.
 *
 * UX rules:
 *  - Optimistic flip on click; the network update follows.
 *  - On error we revert and show a small inline message.
 *  - Initial fetch is forgiving: a network error leaves the toggle
 *    off and the user can still try to flip it.
 */
export function WebSearchToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchPreferences(ac.signal)
      .then((p) => setEnabled(Boolean(p.web_search_enabled)))
      .catch((e) => {
        if (ac.signal.aborted) return;
        // Don't surface network noise — just default to off.
        setEnabled(false);
        setError(e instanceof BotApiError ? e.message : null);
      });
    return () => ac.abort();
  }, []);

  const flip = async () => {
    if (enabled === null || pending) return;
    const next = !enabled;
    setEnabled(next);
    setPending(true);
    setError(null);
    try {
      const result = await updatePreferences({ web_search_enabled: next });
      setEnabled(Boolean(result.web_search_enabled));
    } catch (e) {
      // Revert on error.
      setEnabled(!next);
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setPending(false);
    }
  };

  const isOn = enabled === true;
  const isLoading = enabled === null;

  return (
    <button
      type="button"
      onClick={flip}
      disabled={isLoading || pending}
      className={`w-full glass rounded-2xl border px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all text-left disabled:opacity-60 ${
        isOn
          ? 'border-cyan-400/60 hover:border-cyan-300/80'
          : 'border-slate-700/50 hover:border-cyan-400/40'
      }`}
      aria-pressed={isOn}
      aria-label="Поиск в сети"
    >
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${
          isOn
            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
            : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
        }`}
      >
        {pending || isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Globe className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white">Поиск в сети</div>
        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
          {error
            ? `Ошибка: ${error}`
            : isOn
              ? 'AI ищет актуальные данные при словах «сегодня», «курс», «найди»…'
              : 'AI отвечает только из своих знаний'}
        </div>
      </div>

      {/* Switch */}
      <div
        className={`relative w-11 h-6 rounded-full border transition-colors flex-shrink-0 ${
          isOn ? 'bg-cyan-500/40 border-cyan-400/60' : 'bg-slate-800 border-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            isOn ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
