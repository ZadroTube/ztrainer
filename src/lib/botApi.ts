/**
 * Client for the Family Telegram Bot HTTP API (Flask, hosted on Render).
 *
 * Authentication strategy (the bot accepts either):
 *  1. `Authorization: tma <initData>` — when opened inside Telegram Mini App.
 *     The bot validates the HMAC signature with its bot token (same algo as
 *     the Supabase Edge Function `telegram-auth`).
 *  2. `Authorization: Bearer <supabase_jwt>` — when opened in a browser via
 *     the Login Widget. The bot trusts the JWT after verifying it with the
 *     Supabase JWKS / shared secret and reads telegram_id from `profiles`.
 *
 * All requests are JSON in / JSON out.
 */
import { supabase } from '@/lib/supabase';

const BOT_API_BASE =
  (import.meta.env.VITE_BOT_API_URL as string | undefined) ??
  'https://my-family-bot-yyo9.onrender.com';

async function getAuthHeader(): Promise<string> {
  // Prefer Telegram WebApp initData (set inside the Telegram client).
  const initData = window.Telegram?.WebApp?.initData ?? '';
  if (initData) {
    return `tma ${initData}`;
  }

  // Fallback: Supabase JWT (Login Widget flow on desktop browsers).
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    return `Bearer ${token}`;
  }

  throw new Error('No auth available — open the app from Telegram or sign in via the Login Widget.');
}

export class BotApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
    this.name = 'BotApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Abort signal so callers can cancel inflight requests. */
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = await getAuthHeader();
  const url = `${BOT_API_BASE}${path}`;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON response is acceptable only when the server sent 204.
    if (res.status !== 204) {
      throw new BotApiError(res.status, `Bot API ${path} returned non-JSON response`);
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Bot API ${path} failed with HTTP ${res.status}`);
    throw new BotApiError(res.status, message, payload);
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export interface AboutResponse {
  text: string;
}

export function fetchAbout(signal?: AbortSignal): Promise<AboutResponse> {
  return request<AboutResponse>('/api/about', { signal });
}

export interface WeatherForecastSlot {
  label: string;
  time_hint: string;
  temp: number;
  description: string;
  icon: string;
}

export interface WeatherResponse {
  current: {
    temp: number;
    description: string;
    icon: string;
    code: number;
  };
  advice: string;
  forecast: WeatherForecastSlot[];
  location: {
    name: string;
    localtime: string;
  };
  ts: number;
}

export function fetchWeather(signal?: AbortSignal): Promise<WeatherResponse> {
  return request<WeatherResponse>('/api/weather', { signal });
}

// ---------------------------------------------------------------------------
// Tarot
// ---------------------------------------------------------------------------

export interface TarotResponse {
  cached: boolean;
  date?: string;
  card_name?: string;
  text?: string;
}

export function fetchTarot(signal?: AbortSignal): Promise<TarotResponse> {
  return request<TarotResponse>('/api/tarot', { signal });
}

export function pullTarot(signal?: AbortSignal): Promise<TarotResponse> {
  return request<TarotResponse>('/api/tarot', { method: 'POST', signal });
}

// ---------------------------------------------------------------------------
// Horoscope
// ---------------------------------------------------------------------------

export interface HoroscopeResponse {
  zodiac: string | null;
  text?: string;
  cached?: boolean;
  error?: string;
}

export function fetchHoroscope(signal?: AbortSignal): Promise<HoroscopeResponse> {
  return request<HoroscopeResponse>('/api/horoscope', { signal });
}

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export function setZodiac(zodiac: ZodiacSign, signal?: AbortSignal): Promise<{ ok: boolean; zodiac: string }> {
  return request('/api/horoscope/zodiac', { method: 'POST', body: { zodiac }, signal });
}

// ---------------------------------------------------------------------------
// Memes & images — bot delivers result to the chat.
// ---------------------------------------------------------------------------

export function sendMemes(signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request('/api/memes', { method: 'POST', signal });
}

export function generateImage(prompt: string, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request('/api/image', { method: 'POST', body: { prompt }, signal });
}

// ---------------------------------------------------------------------------
// Today summary
// ---------------------------------------------------------------------------

export interface TodayResponse {
  workout_theme: string | null;
  zodiac: string | null;
  tarot_done: boolean;
}

export function fetchToday(signal?: AbortSignal): Promise<TodayResponse> {
  return request<TodayResponse>('/api/today', { signal });
}

// ---------------------------------------------------------------------------
// Cinema (TMDB via bot)
// ---------------------------------------------------------------------------

export interface TmdbMovie {
  tmdb_id: number;
  title: string;
  year: string;
  overview: string;
  rating: number;
  poster_url: string;
  genre_ids?: number[];
}

export interface TmdbDetails extends TmdbMovie {
  trailer_url: string;
  duration: string;
  genres: string[];
  media_type: string;
}

export interface PremiereMovie {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  overview: string;
  poster_url: string;
}

export type CinemaMood = 'funny' | 'scary' | 'heartfelt' | 'mind' | 'action';

export function cinemaSearch(query: string, signal?: AbortSignal): Promise<{ results: TmdbMovie[] }> {
  return request(`/api/cinema/search?q=${encodeURIComponent(query)}`, { signal });
}

export function cinemaSurprise(signal?: AbortSignal): Promise<{ movie: TmdbMovie | null }> {
  return request('/api/cinema/surprise', { signal });
}

export function cinemaRecommend(mood: CinemaMood, short = false, signal?: AbortSignal): Promise<{ movies: TmdbMovie[] }> {
  const q = `mood=${mood}&short=${short ? 'true' : 'false'}`;
  return request(`/api/cinema/recommend?${q}`, { signal });
}

export function cinemaPremieres(signal?: AbortSignal): Promise<{ movies: PremiereMovie[] }> {
  return request('/api/cinema/premieres', { signal });
}

export function cinemaDetails(tmdbId: number, signal?: AbortSignal): Promise<TmdbDetails> {
  return request(`/api/cinema/details?tmdb_id=${tmdbId}`, { signal });
}
