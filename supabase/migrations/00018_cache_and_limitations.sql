-- Add caching and health limitations columns to profiles table
ALTER TABLE profiles
  ADD COLUMN health_limitations TEXT,
  ADD COLUMN progress_report_cache TEXT,
  ADD COLUMN progress_report_hash TEXT;
