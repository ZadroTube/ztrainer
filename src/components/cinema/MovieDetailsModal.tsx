import { X, Film, Star, Clock, Calendar, Play, Check, Trash2, Edit3, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { type Movie, STATUS_WATCHED } from '@/lib/cinema';
import { ExplainModal } from '@/components/cinema/ExplainModal';

interface MovieDetailsModalProps {
  movie: Movie;
  onClose: () => void;
  /** Available only for watchlist items. */
  onMarkWatched?: () => void;
  /** Available only for watched items. */
  onRate?: () => void;
  onDelete?: () => void;
}

/**
 * Read-only movie details. All metadata comes from the saved row, no extra
 * API hop. Buttons trigger the same actions the list cards expose.
 */
export function MovieDetailsModal({ movie, onClose, onMarkWatched, onRate, onDelete }: MovieDetailsModalProps) {
  const isWatched = movie.status === STATUS_WATCHED;
  const ratingText = movie.rating ?? null;
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-magenta-500/30 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero — poster as backdrop with gradient overlay */}
        <div className="relative">
          <div className="aspect-[16/10] bg-slate-900 overflow-hidden">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt=""
                className="w-full h-full object-cover blur-sm scale-110 opacity-60"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 active:scale-90 w-9 h-9 rounded-full bg-slate-950/70 backdrop-blur hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
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
                CinemaZ
              </div>
              <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{movie.title}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-5 flex-1 overflow-y-auto custom-scrollbar">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300">
            {movie.release_year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {movie.release_year}
              </span>
            )}
            {movie.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {movie.duration}
              </span>
            )}
            {ratingText && (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                {ratingText}
              </span>
            )}
            {movie.media_type && (
              <span className="text-slate-400">{movie.media_type}</span>
            )}
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-magenta-500/15 border border-magenta-500/30 text-magenta-200"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {movie.description ? (
            <p className="text-sm text-slate-200 mt-4 leading-relaxed whitespace-pre-line">
              {movie.description}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-4 italic">Описание не сохранилось.</p>
          )}

          {/* Couple's verdict (watched only) */}
          {isWatched && (movie.husband_rating || movie.wife_rating) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {movie.husband_rating && (
                <div className="glass rounded-xl border border-cyan-500/25 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold">👨 Муж</div>
                  <div className="text-sm font-bold text-white mt-0.5">{movie.husband_rating}</div>
                </div>
              )}
              {movie.wife_rating && (
                <div className="glass rounded-xl border border-magenta-500/25 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-magenta-300/80 font-bold">👩 Жена</div>
                  <div className="text-sm font-bold text-white mt-0.5">{movie.wife_rating}</div>
                </div>
              )}
            </div>
          )}

          {/* Added by */}
          {movie.added_by && (
            <div className="mt-4 text-[11px] text-slate-500">Добавил(а): {movie.added_by}</div>
          )}

          {/* Trailer */}
          {movie.trailer_url && (
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 active:scale-95 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-red-500/50 hover:text-red-300 text-sm font-medium text-slate-200 transition-all"
            >
              <Play className="w-4 h-4" />
              Смотреть трейлер
            </a>
          )}

          {/* Explain via AI — only useful when we have a TMDB id */}
          {movie.tmdb_id && (
            <button
              onClick={() => setExplainOpen(true)}
              className="mt-2 active:scale-95 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/15 border border-purple-500/30 hover:border-purple-400/60 text-sm font-medium text-purple-200 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Объяснить фильм
            </button>
          )}
        </div>

        {/* Action bar */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-700/50 flex items-center gap-2">
          {!isWatched && onMarkWatched && (
            <button
              onClick={onMarkWatched}
              className="flex-1 active:scale-95 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 text-sm font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Посмотрели
            </button>
          )}
          {isWatched && onRate && (
            <button
              onClick={onRate}
              className="flex-1 active:scale-95 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 text-sm font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              {movie.husband_rating || movie.wife_rating ? 'Изменить оценку' : 'Оценить'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="active:scale-95 w-11 h-11 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-all flex items-center justify-center"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {explainOpen && movie.tmdb_id && (
        <ExplainModal
          tmdbId={movie.tmdb_id}
          title={movie.title}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </div>
  );
}
