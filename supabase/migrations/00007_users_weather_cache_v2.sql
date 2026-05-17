-- ============================================================
-- Migration 00007: structured weather cache for the mini-app
-- ============================================================
-- Old `cache_weather` stored a flat string used by the bot in chat.
-- The mini-app needs the parsed structure (current + forecast slots
-- + advice) to render its own weather card. Keep both columns in
-- parallel so the bot's text path is unaffected.

ALTER TABLE users ADD COLUMN IF NOT EXISTS cache_weather_v2 JSONB;
