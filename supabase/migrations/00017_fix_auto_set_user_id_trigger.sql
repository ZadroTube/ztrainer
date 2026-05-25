-- ============================================================
-- Migration 00017: Fix auto_set_user_id trigger function
-- ============================================================
-- Проблема: триггер auto_set_user_id() перезаписывал NEW.user_id на NULL,
-- если запрос выполнялся от имени сервисного бота (auth.uid() = NULL),
-- что нарушало ограничение NOT NULL в таблицах.
-- Решение: перезаписываем NEW.user_id только если auth.uid() не NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
