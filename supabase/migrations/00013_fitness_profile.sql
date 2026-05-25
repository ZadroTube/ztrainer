-- Add fitness profile columns to profiles table
ALTER TABLE profiles
  ADD COLUMN fitness_goal TEXT CHECK (fitness_goal IN (
    'lose_weight', 'gain_muscle', 'endurance', 'general_fitness'
  )),
  ADD COLUMN fitness_level TEXT CHECK (fitness_level IN (
    'beginner', 'intermediate', 'advanced'
  )),
  ADD COLUMN available_minutes INTEGER DEFAULT 60,
  ADD COLUMN training_location TEXT CHECK (training_location IN (
    'gym', 'outdoor', 'home', 'combined'
  )),
  ADD COLUMN equipment TEXT,
  ADD COLUMN birth_year INTEGER,
  ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'));
