-- ============================================================
-- ZTrainer: Supabase Database Schema
-- Telegram Mini App Fitness Tracker
-- ============================================================
-- Важно: auth.uid() в Supabase всегда возвращает UUID.
-- Поэтому profiles.id — это UUID = auth.users.id,
-- а telegram_id хранится отдельным UNIQUE полем.
-- ============================================================

-- 1. PROFILES — привязка auth.users.id ↔ Telegram пользователь
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY,   -- = auth.users.id
  telegram_id   BIGINT UNIQUE NOT NULL,
  username      TEXT,
  first_name    TEXT,
  last_name     TEXT,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. EXERCISES — библиотека упражнений пользователя
-- ============================================================
CREATE TABLE exercises (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  target_muscle_group      TEXT,
  default_sets             INTEGER NOT NULL DEFAULT 3,
  default_reps             INTEGER NOT NULL DEFAULT 10,
  default_rest_time_seconds INTEGER NOT NULL DEFAULT 90,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. WORKOUT_PLANS — запланированные упражнения на конкретную дату
--    Аналог PlannedWorkoutsDict + WorkoutExercise
-- ============================================================
CREATE TABLE workout_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- workoutId
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id         UUID REFERENCES exercises(id) ON DELETE SET NULL,
  plan_date           DATE NOT NULL,
  name                TEXT NOT NULL,
  target_muscle_group TEXT,
  sets                INTEGER NOT NULL CHECK (sets >= 1),
  reps                INTEGER NOT NULL CHECK (reps >= 1),
  rest_time_seconds   INTEGER,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COMPLETED_SETS — выполненные подходы
--    Аналог CompletedSetsDict (ключ: dateStr_workoutId_setIndex)
-- ============================================================
CREATE TABLE completed_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  plan_date       DATE NOT NULL,
  set_index       INTEGER NOT NULL CHECK (set_index >= 0),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workout_plan_id, set_index)
);

-- 5. WORKOUT_SESSIONS — завершённые тренировочные сессии
--    Аналог dailyDurations
-- ============================================================
CREATE TABLE workout_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_date        DATE NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  finished_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EXERCISE_RESTS — зафиксированное время отдыха между упражнениями
--    Аналог actualExerciseRests (ключ: dateStr_workoutId)
-- ============================================================
CREATE TABLE exercise_rests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_plan_id    UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  actual_rest_seconds INTEGER NOT NULL CHECK (actual_rest_seconds >= 0),
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. USER_ACHIEVEMENTS — полученные достижения
--    Аналог userStats.achievements
-- ============================================================
CREATE TABLE user_achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type),
  CONSTRAINT valid_achievement CHECK (
    achievement_type IN ('first_workout', 'streak_3', 'streak_7', 'time_5h', 'volume_100')
  )
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_telegram       ON profiles(telegram_id);
CREATE INDEX idx_exercises_user          ON exercises(user_id);
CREATE INDEX idx_workout_plans_user_date ON workout_plans(user_id, plan_date);
CREATE INDEX idx_completed_sets_user_date ON completed_sets(user_id, plan_date);
CREATE INDEX idx_completed_sets_plan     ON completed_sets(workout_plan_id);
CREATE INDEX idx_workout_sessions_user   ON workout_sessions(user_id, plan_date);
CREATE INDEX idx_exercise_rests_user     ON exercise_rests(user_id);
CREATE INDEX idx_user_achievements_user  ON user_achievements(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- auth.uid() → UUID. Совпадает с profiles.id и user_id во всех таблицах.
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_sets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_rests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_profile" ON profiles
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "owner_exercises" ON exercises
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_workout_plans" ON workout_plans
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_completed_sets" ON completed_sets
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_workout_sessions" ON workout_sessions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_exercise_rests" ON exercise_rests
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_achievements" ON user_achievements
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TRIGGER: автообновление updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
