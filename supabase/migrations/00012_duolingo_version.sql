-- Таблица глобальных настроек бота
create table if not exists public.settings (
    key   text primary key,
    value text not null
);

comment on table public.settings is 'Global bot settings and state.';

-- Инициализируем версию Duolingo старым значением для теста уведомлений
insert into public.settings (key, value)
values ('duolingo_version', '6.79.7')
on conflict (key) do nothing;
