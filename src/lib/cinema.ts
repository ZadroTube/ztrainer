/**
 * Direct CRUD for the `movies` table in Supabase.
 *
 * RLS policy `owner_movies` ensures every authenticated user sees only
 * their own rows. The mini-app talks to Supabase directly — no bot hop —
 * so the list reads stay snappy.
 *
 * Status values mirror the legacy strings the bot writes:
 *   "Ожидает просмотра" / "Уже просмотрено"
 */
import { supabase } from '@/lib/supabase';

export const STATUS_WATCHLIST = 'Ожидает просмотра';
export const STATUS_WATCHED = 'Уже просмотрено';

export type MovieStatus = typeof STATUS_WATCHLIST | typeof STATUS_WATCHED;

export interface Movie {
  id: number;
  title: string;
  tmdb_id: number | null;
  release_year: number | null;
  watch_date: string | null;
  added_by: string | null;
  genres: string[] | null;
  description: string | null;
  wife_rating: string | null;
  husband_rating: string | null;
  poster_url: string | null;
  rating: string | null;
  status: string | null;
  media_type: string | null;
  trailer_url: string | null;
  duration: string | null;
  created_at: string | null;
  updated_at: string | null;
  telegram_id: number | null;
  user_uuid: string | null;
}

export interface NewMovieInput {
  title: string;
  tmdb_id?: number;
  release_year?: number | null;
  added_by?: string;
  genres?: string[];
  description?: string;
  poster_url?: string;
  rating?: number | null;
  status: MovieStatus;
  media_type?: string;
  trailer_url?: string;
  duration?: string;
  watch_date?: string | null;
}

export async function listMovies(status: MovieStatus): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[cinema] listMovies failed:', error);
    return [];
  }
  return (data ?? []) as Movie[];
}

export async function addMovie(input: NewMovieInput): Promise<Movie | null> {
  const payload = {
    title: input.title.slice(0, 200),
    tmdb_id: input.tmdb_id ?? null,
    release_year: input.release_year ?? null,
    added_by: input.added_by ?? null,
    genres: input.genres ?? [],
    description: (input.description ?? '').slice(0, 1000),
    poster_url: input.poster_url ?? null,
    rating: input.rating ?? null,
    status: input.status,
    media_type: input.media_type ?? 'Полнометражный фильм',
    trailer_url: input.trailer_url ?? null,
    duration: input.duration ?? null,
    watch_date: input.watch_date ?? (input.status === STATUS_WATCHED ? new Date().toISOString().slice(0, 10) : null),
  };
  const { data, error } = await supabase.from('movies').insert(payload).select().single();
  if (error) {
    console.error('[cinema] addMovie failed:', error);
    return null;
  }
  return data as Movie;
}

export async function markWatched(movieId: number): Promise<boolean> {
  const { error } = await supabase
    .from('movies')
    .update({
      status: STATUS_WATCHED,
      watch_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', movieId);
  if (error) {
    console.error('[cinema] markWatched failed:', error);
    return false;
  }
  return true;
}

export async function setRating(movieId: number, who: 'husband' | 'wife', score: number): Promise<boolean> {
  const stars = '⭐'.repeat(score);
  const value = `${stars} ${score}/5`;
  const column = who === 'husband' ? 'husband_rating' : 'wife_rating';
  const { error } = await supabase.from('movies').update({ [column]: value }).eq('id', movieId);
  if (error) {
    console.error('[cinema] setRating failed:', error);
    return false;
  }
  return true;
}

export async function deleteMovie(movieId: number): Promise<boolean> {
  const { error } = await supabase.from('movies').delete().eq('id', movieId);
  if (error) {
    console.error('[cinema] deleteMovie failed:', error);
    return false;
  }
  return true;
}
