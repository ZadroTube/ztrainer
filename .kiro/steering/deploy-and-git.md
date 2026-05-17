---
inclusion: always
---

# Deploy & Git Workflow

## Repos

- **Mini-app**: `github.com/ZadroTube/ztrainer` — local at `e:\Coding\Projects\ztrainer\ztrainer`
- **Bot**: `github.com/ZadroTube/family-telegram-bot` — local at `e:\Coding\Projects\ztrainer\family-telegram-bot-master`

Bot was originally a downloaded zip (note the `-master` suffix). Git is
initialised inside, but the directory name stays as-is — don't rename.

## Auto-deploy

- Push to `master` of the **mini-app** repo → Cloudflare Pages builds & deploys.
  Build command: `npm run build`. Output dir: `dist`.
- Push to `master` of the **bot** repo → Render redeploys the worker.
  No CI config — just `python main.py`.

## Migrations & secrets

- DB schema changes go into `supabase/migrations/0000N_*.sql` for history,
  even when applied via the Management API on the fly. Numbers strictly grow.
- Edge Function deploys: `npx supabase functions deploy <name> --project-ref zcirdncgxliympzhjxiu`
  with `SUPABASE_ACCESS_TOKEN` in env.
- Realtime publication tables are managed by SQL (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`).

## Git rules (per user request)

- Author identity: `ZadroTube <luxorxxx@gmail.com>` (already set in repo configs).
- Push directly to `master` — single-developer flow, no PR ceremony.
- Never use `git push --force` without explicit user confirmation.
- Never use `--amend` without explicit user confirmation **after** the commit
  has been pushed (rewriting public history).
- Don't strip line-ending warnings (CRLF/LF) — they're harmless on Windows.

## Build verification before push

After non-trivial changes:
- Mini-app: `npx vite build` — should succeed without errors. Warnings about
  bundle size are okay; we don't tree-shake aggressively.
- Bot: `python -m py_compile <changed_files>` — at minimum a syntax check,
  since deps may not be installed locally.

## Commit messages

Follow **conventional commits** loosely:
- `feat(scope): ...` for user-visible changes
- `fix(scope): ...` for bug fixes
- `chore(scope): ...` for tooling / cleanups

Common scopes: `cinema`, `hub`, `profile`, `fitness`, `api`, `auth`, `realtime`, `cinema`.

## When user says "продолжи" / "дальше"

Look at the most recent finished task in the conversation, infer the next step
from the original roadmap, and proceed. If the roadmap is exhausted, suggest
2–3 concrete next options and let the user pick.
