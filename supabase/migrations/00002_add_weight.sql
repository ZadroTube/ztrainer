-- ============================================================
-- Migration: Add weight support
-- ============================================================

ALTER TABLE exercises ADD COLUMN default_weight_kg NUMERIC CHECK (default_weight_kg >= 0);
ALTER TABLE workout_plans ADD COLUMN weight_kg NUMERIC CHECK (weight_kg >= 0);
