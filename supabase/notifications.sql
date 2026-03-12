--------------------------------------------------------------------------------
-- Notifications table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id                bigserial PRIMARY KEY,
  user_id           bigint      REFERENCES users(id) ON DELETE CASCADE,
  type              text        NOT NULL,
  title             text        NOT NULL,
  message           text        NOT NULL,
  read              boolean     NOT NULL DEFAULT false,
  related_id        text,
  related_type      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );


