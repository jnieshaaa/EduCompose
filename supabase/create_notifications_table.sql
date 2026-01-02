--------------------------------------------------------------------------------
-- Notifications table for teachers
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id                bigserial PRIMARY KEY,
  teacher_id        bigint      REFERENCES teachers(id) ON DELETE CASCADE,
  type              text        NOT NULL,
  title             text        NOT NULL,
  message           text        NOT NULL,
  read              boolean     NOT NULL DEFAULT false,
  related_id        text,
  related_type      text, -- 'essay', 'activity', 'student', etc.
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_teacher_id_idx ON notifications(teacher_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can only see their own notifications
CREATE POLICY "Teachers can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Teachers can insert their own notifications
CREATE POLICY "Teachers can insert their own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Teachers can update their own notifications
CREATE POLICY "Teachers can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

