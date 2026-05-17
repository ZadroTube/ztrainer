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
