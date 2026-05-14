-- ============================================================
-- Migration 00003: Auto-set user_id via trigger + fixups
-- ============================================================
-- Проблема: все INSERT-запросы из фронтенда не содержат user_id,
-- поэтому RLS WITH CHECK (user_id = auth.uid()) отклоняет их,
-- т.к. NULL = auth.uid() → NULL (не TRUE).
-- Решение: триггер перед INSERT автоматически ставит user_id = auth.uid().
-- ============================================================

CREATE OR REPLACE FUNCTION auto_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_user_id_exercises
  BEFORE INSERT ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_user_id_workout_plans
  BEFORE INSERT ON workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_user_id_completed_sets
  BEFORE INSERT ON completed_sets
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_user_id_workout_sessions
  BEFORE INSERT ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_user_id_exercise_rests
  BEFORE INSERT ON exercise_rests
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_user_id_user_achievements
  BEFORE INSERT ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_user_id();
