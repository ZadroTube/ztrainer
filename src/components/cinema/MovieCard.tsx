import { Film, Star, Clock } from 'lucide-react';
import { type Movie, STATUS_WATCHED } from '@/lib/cinema';

interface MovieCardProps {
  movie: Movie;
  /** Optional quick-action button — usually "mark as watched" — overlayed
   * on the card. Tapping it doesn't open details. */
  quickActionLabel?: string;
  onQuickAction?: () => void;
  onClick?: () => void;
}

/**
 * Compact movie card. Tapping the body opens the details modal. The
 * optional quick-action button (e.g. "Посмотрели") sits on the right
 * and stops propagation.
 */
export function MovieCard({ movie, quickActionLabel, onQuickAction, onClick }: MovieCardProps) {
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

        <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col">
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
            <div className="mt-auto pt-2 flex items-center gap-2 text-[10px]">
              {movie.husband_rating && <span className="text-cyan-300">👨 {movie.husband_rating}</span>}
              {movie.wife_rating && <span className="text-magenta-300">👩 {movie.wife_rating}</span>}
            </div>
          )}

          {quickActionLabel && onQuickAction && (
            <div className="mt-auto pt-2">
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onQuickAction();
                  }
                }}
                className="inline-flex items-center gap-1 active:scale-95 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer"
              >
                ✓ {quickActionLabel}
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
