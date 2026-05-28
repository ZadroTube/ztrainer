-- Migration 00019: Fitness tracking features

-- 1. Add rating and notes to workout_sessions
ALTER TABLE public.workout_sessions
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN notes TEXT;

-- 2. Add is_time_based to exercises
ALTER TABLE public.exercises
ADD COLUMN is_time_based BOOLEAN DEFAULT false;

-- 3. Add duration_seconds to workout_plans
ALTER TABLE public.workout_plans
ADD COLUMN duration_seconds INTEGER;
