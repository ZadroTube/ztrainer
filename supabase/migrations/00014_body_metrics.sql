-- Create body_metrics table to track physical changes
CREATE TABLE body_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  weight_kg   NUMERIC(5,1),
  chest_cm    NUMERIC(4,1),
  bicep_r_cm  NUMERIC(4,1),
  bicep_l_cm  NUMERIC(4,1),
  waist_cm    NUMERIC(4,1),
  hips_cm     NUMERIC(4,1),
  thigh_r_cm  NUMERIC(4,1),
  thigh_l_cm  NUMERIC(4,1),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for owners
CREATE POLICY "owner_body_metrics" ON body_metrics
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index for fast user/date query
CREATE INDEX idx_body_metrics_user_date ON body_metrics(user_id, date);

-- Enable realtime subscription for body_metrics
ALTER TABLE body_metrics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE body_metrics;
