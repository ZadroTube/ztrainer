-- Create table for trainer chat messages
CREATE TABLE coach_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL CHECK (sender IN ('user', 'coach')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE coach_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_coach_chat_messages" ON coach_chat_messages
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_coach_chat_messages_user_date ON coach_chat_messages(user_id, created_at);

-- Support Realtime replication
ALTER TABLE coach_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE coach_chat_messages;
