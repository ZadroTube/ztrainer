-- ============================================================
-- Migration 00008: Enable Postgres realtime for fitness tables
-- ============================================================
-- The mini-app subscribes to changes on these tables so that edits
-- on one device (phone) appear instantly on another device (PC) for
-- the same Telegram account, without manual reload.
--
-- RLS still scopes events to rows the user can see, so we don't leak
-- another user's data. Bot continues to write through service role
-- which bypasses RLS — those writes also appear on the user's other
-- devices because the row passes the owner_* policy.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE exercises;
ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE completed_sets;
