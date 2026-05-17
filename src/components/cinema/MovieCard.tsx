import { Film, Star, Clock, Trash2, Check } from 'lucide-react';
import { type Movie, STATUS_WATCHED } from '@/lib/cinema';

interface MovieCardProps {
  movie: Movie;
  /** Show "watched" check button (only for watchlist items). */
  onMarkWatched?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

/**
 * Compact movie card used in the watchlist / watched lists.
 * Poster + title + meta + actions. Matches the neon glassmorphism of the rest of the app.
 */
export function MovieCard({ movie, onMarkWatched, onDelete, onClick }: MovieCardProps) {
  const isWatched = movie.status === STATUS_WATCHED;

  return (
    <div className="glass rounded-2xl border border-slate-700/50 hover:border-magenta-400/40 overflow-hidden transition-all">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="w-full flex gap-3 text-left active:scale-[0.99] disabled:active:scale-100 transition-transform"
      >
        <div className="w-20 h-28 flex-shrink-0 bg-slate-900/60 flex items-center justify-center overflow-hidden">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Film className="w-8 h-8 text-slate-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 py-2 pr-2">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">{movie.title}</h3>

          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            {movie.release_year && <span>{movie.release_year}</span>}
            {movie.duration && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {movie.duration}
              </span>
            )}
            {movie.rating && (
              <span className="inline-flex items-center gap-0.5 text-amber-300">
                <Star className="w-3 h-3 fill-amber-300" />
                {movie.rating}
              </span>
            )}
          </div>

          {movie.genres && movie.genres.length > 0 && (
            <div className="text-[10px] text-magenta-300/80 mt-1 truncate">
              {movie.genres.slice(0, 3).join(' · ')}
            </div>
          )}

          {isWatched && (movie.husband_rating || movie.wife_rating) && (
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              {movie.husband_rating && <span className="text-cyan-300">👨 {movie.husband_rating}</span>}
              {movie.wife_rating && <span className="text-magenta-300">👩 {movie.wife_rating}</span>}
            </div>
          )}
        </div>
      </button>

      {(onMarkWatched || onDelete) && (
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {onMarkWatched && !isWatched && (
            <button
              onClick={onMarkWatched}
              className="flex-1 active:scale-95 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Посмотрели
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="active:scale-95 w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-all flex items-center justify-center"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
