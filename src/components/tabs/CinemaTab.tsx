import { useEffect, useState, useCallback } from 'react';
import { Film, Plus, Sparkles, Calendar, Star } from 'lucide-react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { MovieCard } from '@/components/cinema/MovieCard';
import { AddMovieModal } from '@/components/cinema/AddMovieModal';
import { RecommendModal } from '@/components/cinema/RecommendModal';
import { RatingModal } from '@/components/cinema/RatingModal';
import { MovieDetailsModal } from '@/components/cinema/MovieDetailsModal';
import { PremiereDetailsModal } from '@/components/cinema/PremiereDetailsModal';
import {
  listMovies,
  markWatched,
  deleteMovie,
  STATUS_WATCHED,
  STATUS_WATCHLIST,
  type Movie,
} from '@/lib/cinema';
import { cinemaPremieres, BotApiError, type PremiereMovie } from '@/lib/botApi';
import { cn } from '@/lib/utils';

type SubTab = 'watchlist' | 'watched' | 'premieres';

export function CinemaTab() {
  const [subTab, setSubTab] = useState<SubTab>('watchlist');
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [ratingFor, setRatingFor] = useState<Movie | null>(null);
  const [detailsFor, setDetailsFor] = useState<Movie | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [w1, w2] = await Promise.all([
      listMovies(STATUS_WATCHLIST),
      listMovies(STATUS_WATCHED),
    ]);
    setWatchlist(w1);
    setWatched(w2);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleMarkWatched = async (movie: Movie) => {
    const ok = await markWatched(movie.id);
    if (ok) {
      const moved: Movie = { ...movie, status: STATUS_WATCHED, watch_date: new Date().toISOString().slice(0, 10) };
      // Optimistic move
      setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));
      setWatched((prev) => [moved, ...prev]);
      // Close details (if open) and open rating
      setDetailsFor(null);
      setRatingFor(moved);
    }
  };

  const handleDelete = async (movie: Movie) => {
    if (!confirm(`Удалить "${movie.title}"?`)) return;
    const ok = await deleteMovie(movie.id);
    if (ok) {
      setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));
      setWatched((prev) => prev.filter((m) => m.id !== movie.id));
      setDetailsFor(null);
    }
  };

  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300">
      <SectionHeader
        brand="CinemaZ"
        title="Кино"
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRecOpen(true)}
              className="active:scale-95 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-200 hover:bg-purple-500/25 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Что посмотреть
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="active:scale-95 w-9 h-9 rounded-lg bg-magenta-500/15 border border-magenta-500/40 text-magenta-200 hover:bg-magenta-500/25 flex items-center justify-center transition-all"
              title="Добавить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Sub-tabs */}
      <div className="mx-2 mt-2 flex gap-2">
        <SubTabButton
          active={subTab === 'watchlist'}
          onClick={() => setSubTab('watchlist')}
          accent="magenta"
          icon={<Film className="w-4 h-4" />}
          label="На потом"
          count={watchlist.length}
        />
        <SubTabButton
          active={subTab === 'watched'}
          onClick={() => setSubTab('watched')}
          accent="cyan"
          icon={<Star className="w-4 h-4" />}
          label="Видели"
          count={watched.length}
        />
        <SubTabButton
          active={subTab === 'premieres'}
          onClick={() => setSubTab('premieres')}
          accent="purple"
          icon={<Calendar className="w-4 h-4" />}
          label="Премьеры"
        />
      </div>

      <div className="px-2 mt-3">
        {loading && subTab !== 'premieres' && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 px-2">
            <div className="w-4 h-4 border-2 border-magenta-500/30 border-t-magenta-400 rounded-full animate-spin" />
            Загружаю кинотеку…
          </div>
        )}

        {!loading && subTab === 'watchlist' && (
          <MoviesList
            movies={watchlist}
            emptyText="Пока тут пусто. Добавь первый фильм 🎬"
            onMarkWatched={handleMarkWatched}
            onClick={(m) => setDetailsFor(m)}
          />
        )}

        {!loading && subTab === 'watched' && (
          <MoviesList
            movies={watched}
            emptyText="Ничего ещё не отмечено как просмотренное."
            onClick={(m) => setDetailsFor(m)}
          />
        )}

        {subTab === 'premieres' && <PremieresList onAdded={loadAll} />}
      </div>

      {addOpen && (
        <AddMovieModal
          onClose={() => setAddOpen(false)}
          onAdded={loadAll}
        />
      )}
      {recOpen && (
        <RecommendModal
          onClose={() => setRecOpen(false)}
          onAdded={loadAll}
        />
      )}
      {detailsFor && (
        <MovieDetailsModal
          movie={detailsFor}
          onClose={() => setDetailsFor(null)}
          onMarkWatched={detailsFor.status === STATUS_WATCHLIST ? () => handleMarkWatched(detailsFor) : undefined}
          onRate={detailsFor.status === STATUS_WATCHED ? () => {
            setRatingFor(detailsFor);
            setDetailsFor(null);
          } : undefined}
          onDelete={() => handleDelete(detailsFor)}
        />
      )}
      {ratingFor && (
        <RatingModal
          movie={ratingFor}
          onClose={() => setRatingFor(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  icon,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  accent: 'cyan' | 'magenta' | 'purple';
}) {
  const accentClass =
    accent === 'cyan'
      ? 'border-cyan-500/30 text-cyan-300'
      : accent === 'magenta'
      ? 'border-magenta-500/30 text-magenta-300'
      : 'border-purple-500/30 text-purple-300';

  return (
    <button
      onClick={onClick}
      className={cn(
        'active:scale-95 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all',
        active
          ? `bg-slate-800 border ${accentClass} shadow-[0_4px_10px_rgba(0,0,0,0.5)]`
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass'
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-slate-800/80 text-[10px] text-slate-300">
          {count}
        </span>
      )}
    </button>
  );
}

function MoviesList({
  movies,
  emptyText,
  onMarkWatched,
  onClick,
}: {
  movies: Movie[];
  emptyText: string;
  onMarkWatched?: (m: Movie) => void;
  onClick?: (m: Movie) => void;
}) {
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
          <Film className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm max-w-xs">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movies.map((m) => (
        <MovieCard
          key={m.id}
          movie={m}
          quickActionLabel={onMarkWatched ? 'Посмотрели' : undefined}
          onQuickAction={onMarkWatched ? () => onMarkWatched(m) : undefined}
          onClick={onClick ? () => onClick(m) : undefined}
        />
      ))}
    </div>
  );
}

function PremieresList({ onAdded }: { onAdded?: () => void }) {
  const [movies, setMovies] = useState<PremiereMovie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PremiereMovie | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    cinemaPremieres(ac.signal)
      .then((r) => setMovies(r.movies))
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      });
    return () => ac.abort();
  }, []);

  if (error) {
    return <div className="text-red-300/90 text-sm py-4">Ошибка: {error}</div>;
  }

  if (movies === null) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-6 px-2">
        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        Подбираю премьеры…
      </div>
    );
  }

  if (movies.length === 0) {
    return <div className="text-slate-400 text-sm py-6 text-center">Премьер не найдено.</div>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {movies.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="active:scale-[0.97] glass rounded-2xl border border-purple-500/20 hover:border-purple-400/50 overflow-hidden text-left transition-all"
          >
            <div className="aspect-[2/3] bg-slate-900/60 flex items-center justify-center overflow-hidden">
              {m.poster_url ? (
                <img src={m.poster_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="p-2.5">
              <div className="text-xs font-bold text-white line-clamp-2 leading-tight min-h-[2.4em]">{m.title}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                {m.release_date && <span>{m.release_date}</span>}
                {m.vote_average > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    <Star className="w-3 h-3 fill-amber-300" />
                    {m.vote_average.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <PremiereDetailsModal
          movie={selected}
          onClose={() => setSelected(null)}
          onAdded={onAdded}
        />
      )}
    </>
  );
}
