# ZTrainer

Telegram Mini App для отслеживания тренировок: план на день, выполнение
подходов с таймерами, статистика и достижения. Авторизация — через Telegram
(Mini App `initData` или Login Widget). Стек: React 19 + Vite + TypeScript +
Tailwind 4 + Supabase + PWA.

## Архитектура

- `src/context/AppContext.tsx` — три суб-контекста (UI / WorkoutData / Timer),
  оптимистичные апдейты с rollback, Supabase-синк.
- `src/components/fitness/*` — конструктор плана, тренировка, статистика,
  inline-таймер отдыха.
- `supabase/migrations/*.sql` — схема: `profiles`, `exercises`,
  `workout_plans`, `completed_sets`, `workout_sessions`, `exercise_rests`,
  `user_achievements`. RLS включён везде, политика `user_id = auth.uid()`.
- `supabase/functions/telegram-auth/index.ts` — Edge Function: проверяет
  HMAC-подпись Telegram, заводит/обновляет `auth.users`, возвращает session.

## Локальная разработка

Требования: Node.js 20+, аккаунт Supabase, бот в Telegram.

```bash
npm install
cp .env.example .env.local
# заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev
```

## Настройка Supabase

1. Создать проект, выполнить миграции:
   ```bash
   supabase link --project-ref <REF>
   supabase db push
   ```
2. **Отключить публичные signups** (Auth → Providers → Email: `Enable Sign
   Ups = false`). Аккаунты создаёт только Edge Function через service-role.
3. Развернуть Edge Function:
   ```bash
   supabase functions deploy telegram-auth --no-verify-jwt
   supabase secrets set TELEGRAM_BOT_TOKEN=<bot_token>
   supabase secrets set SB_URL=<project_url>
   supabase secrets set SB_SERVICE_ROLE_KEY=<service_role_key>
   ```

## Настройка Telegram-бота

- `@BotFather` → создать бота, получить `BOT_TOKEN`.
- Установить Mini App URL: `/setmenubutton` или Web App URL в `/mybots`.
- Для Login Widget — добавить домен через `/setdomain`.

## Скрипты

- `npm run dev` — Vite dev server.
- `npm run build` — production-сборка.
- `npm run lint` — TypeScript type-check (без ESLint, см. issue).
- `npm run preview` — превью production-сборки.
