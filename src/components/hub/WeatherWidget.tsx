import { useEffect, useState } from 'react';
import { fetchWeather, type WeatherResponse, BotApiError } from '@/lib/botApi';
import { CloudOff, MapPin, RefreshCw } from 'lucide-react';

const CACHE_KEY = 'zhub:weather:v1';
const SOFT_TTL_MS = 30 * 60 * 1000; // re-fetch in background after 30 min
const HARD_TTL_MS = 6 * 60 * 60 * 1000; // discard cache entirely after 6h

function readCache(): WeatherResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherResponse;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts * 1000 > HARD_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: WeatherResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private mode) — fail quietly.
  }
}

function isStale(data: WeatherResponse | null): boolean {
  if (!data) return true;
  return Date.now() - data.ts * 1000 > SOFT_TTL_MS;
}

/**
 * Weather card for the Home tab. Shows the cached value instantly (so the
 * tab feels alive), then refreshes from the bot API in the background.
 */
export function WeatherWidget() {
  const [data, setData] = useState<WeatherResponse | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchWeather(signal);
      writeCache(fresh);
      setData(fresh);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof BotApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    // Always refresh on mount if cache is stale OR missing. If cache is
    // fresh-ish we still re-fetch silently to surface server-side updates.
    const shouldShowSpinner = !data;
    if (!shouldShowSpinner) {
      // Background refresh — keep current data on screen.
      refresh(ac.signal).catch(() => {});
    } else if (isStale(data)) {
      refresh(ac.signal).catch(() => {});
    }
    if (shouldShowSpinner) {
      refresh(ac.signal).catch(() => {});
    }
    return () => ac.abort();
    // We deliberately depend only on mount — manual refreshes go via the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data && loading) {
    return (
      <div className="glass rounded-2xl p-5 border border-slate-700/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <span className="text-sm text-slate-300">Погода загружается…</span>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="glass rounded-2xl p-5 border border-red-500/30 flex items-start gap-3">
        <CloudOff className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Погода недоступна</div>
          <div className="text-xs text-red-200/80 mt-1">{error}</div>
          <button
            onClick={() => refresh()}
            className="mt-2 text-xs text-cyan-300 hover:text-cyan-200 active:scale-95 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass rounded-2xl p-5 border border-cyan-500/25 relative overflow-hidden">
      {/* soft glow */}
      <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-cyan-300/80 font-bold">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{data.location.name}</span>
          </div>

          <div className="flex items-end gap-3 mt-1">
            <div className="text-4xl font-bold text-white leading-none tabular-nums">
              {data.current.temp > 0 ? `+${data.current.temp}` : data.current.temp}°
            </div>
            <div className="text-sm text-slate-300 leading-tight pb-1">
              {data.current.description}
            </div>
          </div>

          {data.advice && (
            <p className="text-xs text-slate-400 mt-3 whitespace-pre-line">{data.advice}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {data.current.icon && (
            <img
              src={data.current.icon.startsWith('//') ? `https:${data.current.icon}` : data.current.icon}
              alt=""
              className="w-14 h-14 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]"
            />
          )}
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="active:scale-90 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-50 transition-all"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data.forecast.length > 0 && (
        <div className="relative mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.forecast.length}, minmax(0, 1fr))` }}>
          {data.forecast.map((slot, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-900/40 border border-slate-700/40 px-3 py-2 flex items-center gap-2 min-w-0"
            >
              {slot.icon && (
                <img
                  src={slot.icon.startsWith('//') ? `https:${slot.icon}` : slot.icon}
                  alt=""
                  className="w-7 h-7 flex-shrink-0"
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 truncate">
                  {slot.label}
                </span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {slot.temp > 0 ? `+${slot.temp}` : slot.temp}°
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
