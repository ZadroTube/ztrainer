import { useState } from 'react';
import { X, Star, Film, Plus, Check, Sparkles, Dice5 } from 'lucide-react';
import {
  cinemaRecommend,
  cinemaSurprise,
  cinemaDetails,
  BotApiError,
  type TmdbMovie,
  type CinemaMood,
} from '@/lib/botApi';
import { addMovie, STATUS_WATCHLIST, STATUS_WATCHED, type MovieStatus } from '@/lib/cinema';
import { useUIContext } from '@/context/AppContext';

const MOODS: { id: CinemaMood; emoji: string; label: string }[] = [
  { id: 'funny', emoji: '😂', label: 'Смешной' },
  { id: 'scary', emoji: '😱', label: 'Страшный' },
  { id: 'heartfelt', emoji: '🥺', label: 'Душевный' },
  { id: 'mind', emoji: '🤯', label: 'Умный' },
  { id: 'action', emoji: '💥', label: 'Боевик' },
];

interface RecommendModalProps {
  onClose: () => void;
  onAdded?: () => void;
}

export function RecommendModal({ onClose, onAdded }: RecommendModalProps) {
  const { userProfile } = useUIContext();
  const [step, setStep] = useState<'pick-mood' | 'pick-duration' | 'results' | 'surprise'>('pick-mood');
  const [mood, setMood] = useState<CinemaMood | null>(null);
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleMood = (m: CinemaMood) => {
    setMood(m);
    setStep('pick-duration');
  };

  const fetchRecs = async (short: boolean) => {
    if (!mood) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cinemaRecommend(mood, short);
      setMovies(res.movies);
      setStep('results');
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSurprise = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cinemaSurprise();
      setMovies(res.movie ? [res.movie] : []);
      setStep('surprise');
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (movie: TmdbMovie, status: MovieStatus) => {
    if (savingId !== null) return;
    setSavingId(movie.tmdb_id);
    try {
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
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-purple-500/30 max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              CinemaZ
            </div>
            <h3 className="text-base font-bold text-white">Что посмотреть</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {error && (
            <div className="text-red-300/90 text-sm mb-3">Ошибка: {error}</div>
          )}

          {step === 'pick-mood' && (
            <>
              <p className="text-sm text-slate-300 mb-3 inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                Какое настроение сегодня?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleMood(m.id)}
                    className="active:scale-95 glass rounded-xl border border-slate-700/50 hover:border-purple-400/60 px-3 py-3 flex items-center gap-2 transition-all"
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-sm font-medium text-white">{m.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={fetchSurprise}
                disabled={loading}
                className="w-full mt-3 active:scale-95 glass rounded-xl border border-cyan-500/30 hover:border-cyan-400/60 px-3 py-3 flex items-center gap-2 justify-center text-sm font-bold text-cyan-200 transition-all disabled:opacity-50"
              >
                <Dice5 className="w-4 h-4" />
                {loading ? 'Бросаю кубик…' : 'Сюрприз'}
              </button>
            </>
          )}

          {step === 'pick-duration' && (
            <>
              <p className="text-sm text-slate-300 mb-3">Сколько времени есть?</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => fetchRecs(true)}
                  disabled={loading}
                  className="active:scale-95 glass rounded-xl border border-slate-700/50 hover:border-purple-400/60 px-4 py-4 text-left transition-all disabled:opacity-50"
                >
                  <div className="text-sm font-bold text-white">⚡ Покороче</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">До 1.5 часов</div>
                </button>
                <button
                  onClick={() => fetchRecs(false)}
                  disabled={loading}
                  className="active:scale-95 glass rounded-xl border border-slate-700/50 hover:border-purple-400/60 px-4 py-4 text-left transition-all disabled:opacity-50"
                >
                  <div className="text-sm font-bold text-white">🕐 Любая длина</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Подбираю по полной</div>
                </button>
              </div>
              {loading && (
                <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  ИИ подбирает фильмы…
                </div>
              )}
            </>
          )}

          {(step === 'results' || step === 'surprise') && (
            <div className="space-y-3">
              {movies.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-6">Ничего не нашлось.</div>
              ) : (
                movies.map((movie) => {
                  const saved = savedIds.has(movie.tmdb_id);
                  const saving = savingId === movie.tmdb_id;
                  return (
                    <div key={movie.tmdb_id} className="glass rounded-xl border border-slate-700/40 overflow-hidden">
                      <div className="flex">
                        <div className="w-24 h-32 flex-shrink-0 bg-slate-900/60 flex items-center justify-center overflow-hidden">
                          {movie.poster_url ? (
                            <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-7 h-7 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 p-3 flex flex-col">
                          <div className="text-sm font-bold text-white line-clamp-2">{movie.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {movie.year && <span>{movie.year}</span>}
                            {movie.rating > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-amber-300">
                                <Star className="w-3 h-3 fill-amber-300" />
                                {movie.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {movie.overview && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">{movie.overview}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 pb-3">
                        <button
                          onClick={() => handleAdd(movie, STATUS_WATCHLIST)}
                          disabled={saved || saving}
                          className={`flex-1 active:scale-95 text-xs font-medium px-2 py-2 rounded-lg transition-all ${
                            saved
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                              : 'bg-magenta-500/15 border border-magenta-500/40 text-magenta-200 hover:bg-magenta-500/25 disabled:opacity-50'
                          }`}
                        >
                          {saved ? (
                            <span className="inline-flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> В списке</span>
                          ) : saving ? (
                            '…'
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> В список</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleAdd(movie, STATUS_WATCHED)}
                          disabled={saved || saving}
                          className="active:scale-95 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50 transition-all"
                          title="Уже видели!"
                        >
                          ✅
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setMovies([]);
                    setStep('pick-mood');
                  }}
                  className="flex-1 active:scale-95 text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:border-purple-500/40 hover:text-purple-300 transition-all"
                >
                  Другое настроение
                </button>
                {step === 'surprise' && (
                  <button
                    onClick={fetchSurprise}
                    disabled={loading}
                    className="flex-1 active:scale-95 text-xs font-medium px-3 py-2.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:border-cyan-400/60 disabled:opacity-50 transition-all"
                  >
                    {loading ? '…' : 'Ещё сюрприз'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
