-- ============================================================
-- Migration 00009: extend realtime publication to workout_sessions
-- and exercise_rests so cross-device sync also covers timer/duration data.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE exercise_rests;
