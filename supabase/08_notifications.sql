--------------------------------------------------------------------------------
-- 08_notifications.sql — Notifications + Activity Logs
--------------------------------------------------------------------------------

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(auth_user_id) ON DELETE CASCADE,
  type         text NOT NULL,
  title        text NOT NULL,
  message      text NOT NULL,
  read         boolean NOT NULL DEFAULT false,
  related_id   text,
  related_type text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notifications"
  ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(auth_user_id) ON DELETE CASCADE,
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  description text NOT NULL,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Users can view their own logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS al_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS al_created_at_idx ON activity_logs(created_at);
