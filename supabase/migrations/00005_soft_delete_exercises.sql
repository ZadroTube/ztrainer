-- Soft-delete for exercises: when an exercise is "deleted" by the user,
-- we mark it as archived instead of removing the row. This preserves
-- workout_plans.exercise_id references and keeps exercise history intact.

ALTER TABLE exercises ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Update RLS: owner policy still works (user_id = auth.uid()), but the
-- app should filter out archived exercises on read (WHERE archived_at IS NULL).
-- No policy change needed — the app filters in SELECT.

-- Change the FK action on workout_plans: we no longer need ON DELETE SET NULL
-- because exercises won't be hard-deleted. For safety, switch to RESTRICT so
-- any accidental hard-delete is caught.
ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS workout_plans_exercise_id_fkey;
ALTER TABLE workout_plans
  ADD CONSTRAINT workout_plans_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;
