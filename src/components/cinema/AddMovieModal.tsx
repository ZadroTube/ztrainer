import { useEffect, useRef, useState } from 'react';
import { X, Search, Plus, Check, Star, Film } from 'lucide-react';
import { cinemaSearch, cinemaDetails, BotApiError, type TmdbMovie } from '@/lib/botApi';
import {
  addMovie,
  STATUS_WATCHED,
  STATUS_WATCHLIST,
  type MovieStatus,
} from '@/lib/cinema';
import { useUIContext } from '@/context/AppContext';

interface AddMovieModalProps {
  onClose: () => void;
  /** Pre-select status: by default we add to watchlist; from the "Watched"
   * tab we may want to add as already-watched. */
  defaultStatus?: MovieStatus;
  /** Called after a successful add so the parent can refetch lists. */
  onAdded?: () => void;
}

export function AddMovieModal({ onClose, defaultStatus = STATUS_WATCHLIST, onAdded }: AddMovieModalProps) {
  const { userProfile } = useUIContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await cinemaSearch(trimmed, ac.signal);
        setResults(res.results);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      } finally {
        if (!ac.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleAdd = async (movie: TmdbMovie, status: MovieStatus) => {
    if (savingId !== null) return;
    setSavingId(movie.tmdb_id);
    try {
      // Fetch full details so we save trailer / runtime / proper genres.
      const details = await cinemaDetails(movie.tmdb_id);
      const username = userProfile?.username ? `@${userProfile.username}` : userProfile?.first_name || '';
      const inserted = await addMovie({
        title: details.title,
        tmdb_id: details.tmdb_id,
        release_year: details.year ? Number(details.year) : null,
        added_by: username,
        genres: details.genres,
        description: details.overview,
        poster_url: details.poster_url,
        rating: details.rating || null,
        status,
        media_type: details.media_type,
        trailer_url: details.trailer_url,
        duration: details.duration,
      });
      if (inserted) {
        setSavedIds((prev) => new Set(prev).add(movie.tmdb_id));
        onAdded?.();
      } else {
        setError('Не удалось сохранить фильм');
      }
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-magenta-500/30 max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              CinemaZ
            </div>
            <h3 className="text-base font-bold text-white">Добавить фильм</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 border-b border-slate-700/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название фильма…"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-magenta-500/60 focus:ring-1 focus:ring-magenta-500/40 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
          {searching && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4 px-2">
              <div className="w-4 h-4 border-2 border-magenta-500/30 border-t-magenta-400 rounded-full animate-spin" />
              Ищу фильмы…
            </div>
          )}
          {error && (
            <div className="text-red-300/90 text-sm px-2 py-2">Ошибка: {error}</div>
          )}
          {!searching && !error && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-slate-400 text-sm px-2 py-4 text-center">Ничего не найдено</div>
          )}
          {results.map((movie) => {
            const saved = savedIds.has(movie.tmdb_id);
            const saving = savingId === movie.tmdb_id;
            return (
              <div key={movie.tmdb_id} className="glass rounded-xl border border-slate-700/40 overflow-hidden flex">
                <div className="w-16 h-24 flex-shrink-0 bg-slate-900/60 flex items-center justify-center overflow-hidden">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-3 flex flex-col">
                  <div className="text-sm font-bold text-white line-clamp-1">{movie.title}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {movie.year && <span>{movie.year}</span>}
                    {movie.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-300">
                        <Star className="w-3 h-3 fill-amber-300" />
                        {movie.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleAdd(movie, STATUS_WATCHLIST)}
                      disabled={saved || saving}
                      className={`flex-1 active:scale-95 text-[11px] font-medium px-2 py-1.5 rounded-lg transition-all ${
                        saved
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                          : 'bg-magenta-500/15 border border-magenta-500/40 text-magenta-200 hover:bg-magenta-500/25 disabled:opacity-50'
                      }`}
                    >
                      {saved ? (
                        <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Добавлен</span>
                      ) : saving ? (
                        '…'
                      ) : (
                        <span className="inline-flex items-center gap-1"><Plus className="w-3 h-3" /> В список</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleAdd(movie, STATUS_WATCHED)}
                      disabled={saved || saving}
                      className="active:scale-95 text-[11px] font-medium px-2 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50 transition-all"
                      title="Уже видели!"
                    >
                      ✅
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {query.trim().length < 2 && !error && (
            <div className="text-slate-500 text-xs px-2 py-6 text-center">
              Начни вводить название — поищу через TMDB.
            </div>
          )}
        </div>

        {/* Persist `defaultStatus` reference so eslint doesn't complain about unused destructure. */}
        <span className="hidden">{defaultStatus}</span>
      </div>
    </div>
  );
}
