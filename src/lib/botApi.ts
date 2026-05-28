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
import { BodyMetric, CoachMessage, CoachAdaptation } from '@/types';

const BOT_API_BASE =
  (import.meta.env.VITE_BOT_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:10000' : 'https://my-family-bot-yyo9.onrender.com');

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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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

export type ExplainMode = 'plot' | 'ending';

export function cinemaExplain(tmdbId: number, mode: ExplainMode, signal?: AbortSignal): Promise<{ text: string }> {
  return request(`/api/cinema/explain?tmdb_id=${tmdbId}&mode=${mode}`, { signal });
}

// ---------------------------------------------------------------------------
// Cinema guess game
// ---------------------------------------------------------------------------

export interface NewRiddle {
  riddle_id: string;
  riddle: string;
}

export interface CheckGuessResponse {
  correct: boolean;
  message: string;
  correct_title?: string;
}

export function cinemaGuessNew(signal?: AbortSignal): Promise<NewRiddle> {
  return request('/api/cinema/guess/new', { method: 'POST', signal });
}

export function cinemaGuessCheck(riddleId: string, answer: string, signal?: AbortSignal): Promise<CheckGuessResponse> {
  return request('/api/cinema/guess/check', { method: 'POST', body: { riddle_id: riddleId, answer }, signal });
}

export function cinemaGuessReveal(riddleId: string, signal?: AbortSignal): Promise<{ correct_title: string }> {
  return request('/api/cinema/guess/reveal', { method: 'POST', body: { riddle_id: riddleId }, signal });
}

export interface BackfillResult {
  processed: number;
  updated: number;
  failed: { id: number; title: string; reason: string }[];
}

export function cinemaBackfill(signal?: AbortSignal): Promise<BackfillResult> {
  return request('/api/cinema/backfill', { method: 'POST', signal });
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export type NewsSource = 'irkutsk' | 'world';

export interface NewsItem {
  title: string;
  /** RBC/irk.ru summary or AI-written summary for topic search. */
  summary?: string;
  /** Topic-search items use `description` instead of `summary` (raw shape from search_news_by_topic). */
  description?: string;
  link: string;
  /** Topic-search items also carry the source name. */
  source?: string;
}

export function fetchTopNews(source: NewsSource, signal?: AbortSignal): Promise<{ items: NewsItem[]; cached: boolean }> {
  return request(`/api/news/top?source=${source}`, { signal });
}

export function fetchTopicNews(topic: string, signal?: AbortSignal): Promise<{ items: NewsItem[] }> {
  return request(`/api/news/topic?q=${encodeURIComponent(topic)}`, { signal });
}

// ---------------------------------------------------------------------------
// AI-known profile (the dossier the bot keeps about the user)
// ---------------------------------------------------------------------------

export interface MeProfileResponse {
  profile: string;
  zodiac: string | null;
}

export function fetchMeProfile(signal?: AbortSignal): Promise<MeProfileResponse> {
  return request<MeProfileResponse>('/api/me/profile', { signal });
}

export function addProfileFact(fact: string, signal?: AbortSignal): Promise<{ profile: string }> {
  return request('/api/me/profile/fact', { method: 'POST', body: { fact }, signal });
}

export function clearProfile(signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request('/api/me/profile/clear', { method: 'POST', signal });
}

export function fetchMeSummary(signal?: AbortSignal): Promise<{ text: string }> {
  return request('/api/me/summary', { signal });
}

// ---------------------------------------------------------------------------
// User preferences (per-user Hub toggles)
// ---------------------------------------------------------------------------

export interface UserPreferences {
  web_search_enabled: boolean;
}

export function fetchPreferences(signal?: AbortSignal): Promise<UserPreferences> {
  return request<UserPreferences>('/api/preferences', { signal });
}

export function updatePreferences(
  patch: Partial<UserPreferences>,
  signal?: AbortSignal,
): Promise<UserPreferences> {
  return request<UserPreferences>('/api/preferences', {
    method: 'PATCH',
    body: patch,
    signal,
  });
}


// ---------------------------------------------------------------------------
// Announcements ("What's new" cards on the Home tab, admin-managed)
// ---------------------------------------------------------------------------

export interface Announcement {
  id: number;
  title: string;
  body: string;
  created_at: string;  // ISO timestamp
  updated_at: string;  // ISO timestamp
}

export interface ActiveAnnouncementResponse {
  announcement: Announcement | null;
  is_admin: boolean;
}

export function fetchActiveAnnouncement(signal?: AbortSignal): Promise<ActiveAnnouncementResponse> {
  return request<ActiveAnnouncementResponse>('/api/announcements/active', { signal });
}

export function createAnnouncement(
  data: { title: string; body: string },
  signal?: AbortSignal,
): Promise<{ announcement: Announcement }> {
  return request('/api/announcements', { method: 'POST', body: data, signal });
}

export function updateAnnouncement(
  id: number,
  patch: Partial<{ title: string; body: string }>,
  signal?: AbortSignal,
): Promise<{ announcement: Announcement }> {
  return request(`/api/announcements/${id}`, { method: 'PATCH', body: patch, signal });
}

export function deleteAnnouncement(id: number, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request(`/api/announcements/${id}`, { method: 'DELETE', signal });
}


// ---------------------------------------------------------------------------
// Broadcast (admin-only: send message to all bot users via Telegram)
// ---------------------------------------------------------------------------

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
  errors: { user_id: number; error: string }[];
}

export interface BroadcastPreview {
  preview: string;
  total_users: number;
}

export function broadcastPreview(text: string, signal?: AbortSignal): Promise<BroadcastPreview> {
  return request<BroadcastPreview>('/api/broadcast/preview', { method: 'POST', body: { text }, signal });
}

export function broadcastSend(text: string, signal?: AbortSignal): Promise<BroadcastResult> {
  return request<BroadcastResult>('/api/broadcast', { method: 'POST', body: { text }, signal });
}


// ---------------------------------------------------------------------------
// Fitness AI Coach
// ---------------------------------------------------------------------------

export interface AIPlanExercise {
  name: string;
  muscle_group?: string;
  target_muscle_group?: string;
  sets: number;
  reps: number;
  weight_kg?: number | null;
  rest_seconds?: number;
}

export interface PreGenerateCheckResponse {
  question: string;
}

export function checkPreGenerate(signal?: AbortSignal): Promise<PreGenerateCheckResponse> {
  return request<PreGenerateCheckResponse>('/api/fitness/pre-generate-check', {
    method: 'GET',
    signal,
  });
}

export interface GeneratePlanResponse {
  plan: Record<string, AIPlanExercise[]>;
  summary: string;
}

export function generatePlan(
  period: 'day' | 'week' | 'month',
  startDate: string,
  userWishes?: string,
  signal?: AbortSignal,
): Promise<GeneratePlanResponse> {
  return request<GeneratePlanResponse>('/api/fitness/generate-plan', {
    method: 'POST',
    body: { period, start_date: startDate, user_wishes: userWishes },
    signal,
  });
}

export function applyPlan(
  plan: Record<string, AIPlanExercise[]>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; exercises_created: number }> {
  return request('/api/fitness/apply-plan', {
    method: 'POST',
    body: { plan },
    signal,
  });
}

export function fetchBodyMetrics(signal?: AbortSignal): Promise<BodyMetric[]> {
  return request<BodyMetric[]>('/api/fitness/metrics', { signal });
}

export function saveBodyMetrics(metrics: Partial<BodyMetric>, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/fitness/metrics', {
    method: 'POST',
    body: metrics,
    signal,
  });
}

export function fetchProgressReport(signal?: AbortSignal): Promise<{ report: string }> {
  return request<{ report: string }>('/api/fitness/progress-report', { signal });
}

export function fetchCoachMessages(signal?: AbortSignal): Promise<CoachMessage[]> {
  return request<CoachMessage[]>('/api/fitness/coach/messages', { signal });
}

export function sendCoachMessage(message: string, signal?: AbortSignal): Promise<CoachMessage> {
  return request<CoachMessage>('/api/fitness/coach/messages', {
    method: 'POST',
    body: { message },
    signal,
  });
}

export function deleteCoachMessage(messageId: string, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/fitness/coach/messages?id=${messageId}`, {
    method: 'DELETE',
    signal,
  });
}

export function clearCoachChat(signal?: AbortSignal): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/fitness/coach/messages', {
    method: 'DELETE',
    signal,
  });
}

export interface NoAdaptationResponse {
  status: 'no_adaptation_needed';
  message: string;
}

export function fetchCoachAdaptation(signal?: AbortSignal): Promise<CoachAdaptation | NoAdaptationResponse> {
  return request<CoachAdaptation | NoAdaptationResponse>('/api/fitness/adaptation', { signal });
}

export function applyCoachAdaptation(adaptationId: string, signal?: AbortSignal): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/fitness/adaptation/apply', {
    method: 'POST',
    body: { adaptation_id: adaptationId },
    signal,
  });
}

export function dismissCoachAdaptation(adaptationId: string, signal?: AbortSignal): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/fitness/adaptation/dismiss', {
    method: 'POST',
    body: { adaptation_id: adaptationId },
    signal,
  });
}


