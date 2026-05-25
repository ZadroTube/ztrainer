CREATE TABLE coach_adaptations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'dismissed')),
  explanation         TEXT NOT NULL,
  suggested_changes   JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE coach_adaptations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_coach_adaptations" ON coach_adaptations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_coach_adaptations_user_status ON coach_adaptations(user_id, status);

-- Add to Realtime
ALTER TABLE coach_adaptations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE coach_adaptations;
