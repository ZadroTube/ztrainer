import { useState } from 'react';
import { X, Film, Star, Plus, Check, BookOpen } from 'lucide-react';
import { cinemaDetails, BotApiError, type PremiereMovie } from '@/lib/botApi';
import { addMovie, STATUS_WATCHLIST } from '@/lib/cinema';
import { useUIContext } from '@/context/AppContext';
import { ExplainModal } from '@/components/cinema/ExplainModal';

interface PremiereDetailsModalProps {
  movie: PremiereMovie;
  onClose: () => void;
  onAdded?: () => void;
}

/**
 * Lightweight premiere modal — shows the slim TMDB info we already cached
 * server-side, plus actions: add to watchlist, AI explain (plot only —
 * concovka spoilers are pointless on an unreleased film).
 */
export function PremiereDetailsModal({ movie, onClose, onAdded }: PremiereDetailsModalProps) {
  const { userProfile } = useUIContext();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);

  const handleAdd = async () => {
    if (adding || added) return;
    setAdding(true);
    setError(null);
    try {
      // Pull fresh details so we save trailer / runtime / proper genres.
      const details = await cinemaDetails(movie.id);
      const username = userProfile?.username ? `@${userProfile.username}` : userProfile?.first_name || '';
      const inserted = await addMovie({
        title: details.title || movie.title,
        tmdb_id: details.tmdb_id || movie.id,
        release_year: details.year ? Number(details.year) : (movie.release_date ? Number(movie.release_date.slice(0, 4)) : null),
        added_by: username,
        genres: details.genres,
        description: details.overview || movie.overview,
        poster_url: details.poster_url || movie.poster_url,
        rating: details.rating || movie.vote_average || null,
        status: STATUS_WATCHLIST,
        media_type: details.media_type,
        trailer_url: details.trailer_url,
        duration: details.duration,
      });
      if (inserted) {
        setAdded(true);
        onAdded?.();
      } else {
        setError('Не удалось сохранить');
      }
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-purple-500/30 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="aspect-[16/10] bg-slate-900 overflow-hidden">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt="" className="w-full h-full object-cover blur-sm scale-110 opacity-60" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Film className="w-12 h-12 text-slate-600" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          </div>

          <button onClick={onClose} className="absolute top-3 right-3 active:scale-90 w-9 h-9 rounded-full bg-slate-950/70 backdrop-blur hover:bg-slate-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="absolute -bottom-1 left-0 right-0 px-5 pb-3 flex items-end gap-3">
            {movie.poster_url && (
              <div className="w-20 h-28 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
                <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
                Премьера
              </div>
              <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{movie.title}</h3>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-300">
            {movie.release_date && <span>📅 {movie.release_date}</span>}
            {movie.vote_average > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>

          {movie.overview ? (
            <p className="text-sm text-slate-200 mt-3 leading-relaxed">{movie.overview}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-3 italic">Описание появится ближе к премьере.</p>
          )}

          <button
            onClick={() => setExplainOpen(true)}
            className="mt-4 active:scale-95 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 hover:border-purple-400/60 text-sm font-medium text-purple-200 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Подробнее о фильме
          </button>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-700/50">
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className={`w-full active:scale-95 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              added
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : 'bg-magenta-500/15 border border-magenta-500/40 text-magenta-200 hover:bg-magenta-500/25 disabled:opacity-50'
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {added ? 'Уже в списке на потом' : adding ? 'Сохраняю…' : 'Добавить в список на потом'}
          </button>
          {error && <div className="text-red-300/90 text-xs mt-2 text-center">{error}</div>}
        </div>
      </div>

      {explainOpen && (
        <ExplainModal
          tmdbId={movie.id}
          title={movie.title}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </div>
  );
}
