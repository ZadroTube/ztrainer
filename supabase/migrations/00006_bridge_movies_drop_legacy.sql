-- ============================================================
-- Migration 00006: Bridge movies to UUID profiles + cleanup
-- ============================================================
-- Goals:
-- 1) Make `movies` accessible from the mini-app under RLS by linking
--    each row to a UUID profile (movies.user_uuid -> profiles.id).
-- 2) Auto-fill user_uuid/telegram_id on insert so neither the bot
--    (service role, telegram_id only) nor the mini-app (auth.uid())
--    has to know the other identifier.
-- 3) Drop legacy `plan` and `diary` tables — bot is being migrated to
--    `workout_plans` + `workout_sessions` + `completed_sets`.
-- ============================================================

-- 1. Link movies to profiles via UUID
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Backfill existing rows: match by telegram_id
UPDATE movies m
SET user_uuid = p.id
FROM profiles p
WHERE p.telegram_id = m.telegram_id
  AND m.user_uuid IS NULL;

-- Useful index for RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_movies_user_uuid ON movies(user_uuid);

-- 2. Enable RLS on movies. Service role bypasses RLS, so the bot keeps working.
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_movies" ON movies;
CREATE POLICY "owner_movies" ON movies
  FOR ALL USING (user_uuid = auth.uid())
  WITH CHECK (user_uuid = auth.uid());

-- 3. Trigger: auto-fill user_uuid (from auth.uid() if mini-app) and
--    telegram_id (looked up from profiles when missing).
CREATE OR REPLACE FUNCTION movies_auto_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_uuid IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_uuid := auth.uid();
  END IF;
  IF NEW.telegram_id IS NULL AND NEW.user_uuid IS NOT NULL THEN
    SELECT telegram_id INTO NEW.telegram_id FROM profiles WHERE id = NEW.user_uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS movies_auto_user_trigger ON movies;
CREATE TRIGGER movies_auto_user_trigger
  BEFORE INSERT ON movies
  FOR EACH ROW
  EXECUTE FUNCTION movies_auto_user();

-- 4. Drop legacy workout tables (bot will use workout_plans / completed_sets / workout_sessions)
DROP TABLE IF EXISTS plan;
DROP TABLE IF EXISTS diary;
