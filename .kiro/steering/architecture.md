---
inclusion: always
---

# ZTrainer Architecture

A two-piece product:

1. **Mini-app** (`ztrainer/`) — Telegram WebApp UI on Cloudflare Workers/Pages.
   - **URL**: `https://ztrainer.luxorxxx.workers.dev` (also reachable via the bot's chat menu button "🚀 Меню")
   - **Stack**: Vite + React 19 + TypeScript + Tailwind v4 + `@supabase/supabase-js`
   - **PWA**: vite-plugin-pwa with autoUpdate + clientsClaim + skipWaiting (so SW upgrades push instantly)
   - **Auth**: two flows — Telegram WebApp `initData` inside the client, Telegram Login Widget on desktop browser. Both end up as Supabase JWT.

2. **Family Telegram Bot** (`family-telegram-bot-master/`) — Python bot + Flask sidecar on Render.
   - **URL**: `https://my-family-bot-yyo9.onrender.com`
   - **Stack**: python-telegram-bot v22 + Flask 3 + Supabase Python SDK + httpx
   - **Mini-app HTTP API** lives under `/api/*` (see `webapp_api.py`). Auth by `Authorization: tma <initData>` (in Telegram) or `Bearer <supabase_jwt>` (browser).

## Data layer (Supabase)

Project ref: `zcirdncgxliympzhjxiu`. All tables in `public`.

**Mini-app domain** (RLS by `auth.uid()`, `user_id` is UUID = `auth.users.id`):
- `profiles` — UUID profile + `telegram_id` link
- `exercises` — exercise library (soft-delete via `archived_at`)
- `workout_plans` — planned exercises per date
- `completed_sets` — checked-off sets per `(workout_plan_id, set_index)`
- `workout_sessions` — finished workout durations
- `exercise_rests` — actual rest seconds between exercises
- `user_achievements` — unlocked achievements

**Bot domain** (legacy `user_id` = telegram_id `bigint`, no RLS, accessed via service role):
- `users` — telegram users with AI profile/summary, zodiac, JSONB caches (weather, horoscope, tarot, premieres)
- `movies` — cinema library; bridged to UUID via `user_uuid` column + RLS so the mini-app can read it directly

**Realtime**: `exercises`, `workout_plans`, `completed_sets` are in `supabase_realtime` publication for cross-device sync.

## Auth flows

- Mini-app inside Telegram: `initData` → Edge Function `telegram-auth` (`supabase/functions/telegram-auth/index.ts`) → returns Supabase tokens.
- Desktop browser: Telegram Login Widget → Edge Function (different path: `authData`) → tokens.
- Bot HTTP API: validates either `tma <initData>` (HMAC SHA-256 with bot token) or `Bearer <jwt>` (forwards to Supabase `/auth/v1/user`). Source: `webapp_auth.py`.

## Deploy

- **Mini-app** → Cloudflare Pages auto-deploys on push to `master` of `github.com/ZadroTube/ztrainer`.
- **Bot** → Render auto-deploys on push to `master` of `github.com/ZadroTube/family-telegram-bot`.
- **Edge Functions** → manual deploy via `npx supabase functions deploy <name> --project-ref zcirdncgxliympzhjxiu` (token in `SUPABASE_ACCESS_TOKEN`).
- **DB migrations** → applied via Supabase Management API (`https://api.supabase.com/v1/projects/<ref>/database/query`). Stored in `supabase/migrations/` for history.

## Environments / config

Mini-app build-time env (Cloudflare Pages env vars):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BOT_API_URL` (optional override — defaults to Render URL in `botApi.ts`)

Bot env (Render env vars): see `config.py`. Notion vars are gone — `notion_db.py` is deleted, all data lives in Supabase now.

## Conventions

- **Optimistic updates**: mini-app updates local state, then `supaSafe` writes to Supabase and rolls back on error. See `AppContext.tsx`.
- **Soft delete**: never hard-delete `exercises` rows (FK from `workout_plans`). Use `archived_at`.
- **Realtime safety**: subscribers in `AppContext` check for `archived_at != null` and treat that as a delete.
- **AI logging**: every AI call goes through `ai_logger.ai_log` (centralised in `ai_logger.py`). One log line per attempt with `task=` `model=` `status=` `ms=` `tokens=`.
