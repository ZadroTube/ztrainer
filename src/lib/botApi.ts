/**
 * Client for the Family Telegram Bot HTTP API (Flask, hosted on Render).
 *
 * Authentication: every request carries `Authorization: tma <initData>`
 * where <initData> is the raw query string from `Telegram.WebApp.initData`.
 * The bot validates the HMAC signature with its bot token (same algorithm
 * the Supabase Edge Function uses for `telegram-auth`).
 *
 * All requests are JSON in / JSON out. Errors are surfaced as thrown
 * exceptions with a meaningful message.
 */

const BOT_API_BASE =
  (import.meta.env.VITE_BOT_API_URL as string | undefined) ??
  'https://my-family-bot-yyo9.onrender.com';

function getInitData(): string {
  // window.Telegram.WebApp is created by telegram-web-app.js — see index.html.
  const initData = window.Telegram?.WebApp?.initData ?? '';
  if (!initData) {
    throw new Error('Telegram WebApp initData is empty — open the app from inside Telegram.');
  }
  return initData;
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
  const initData = getInitData();
  const url = `${BOT_API_BASE}${path}`;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${initData}`,
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
