-- "Что нового" — объявления админа на главной мини-апп.
-- Активное объявление в UI = последняя запись с published=true.
-- Удаление через UI делает soft-delete (published=false), история остаётся.

create table if not exists public.announcements (
    id          bigserial primary key,
    title       text not null,
    body        text not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    published   boolean not null default true
);

create index if not exists announcements_active_idx
    on public.announcements (published, updated_at desc);

comment on table public.announcements is
    'Admin "What''s new" announcements shown on the mini-app Home tab.';
comment on column public.announcements.published is
    'Soft-delete flag. Active announcement = the most recently updated row with published=true.';
