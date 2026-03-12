-- Migration: Replace teacher_id with user_id in notifications and essay_activities tables
-- Since teachers table no longer exists, we'll reference users table directly

-- 1. Update notifications table
ALTER TABLE notifications 
  DROP COLUMN IF EXISTS teacher_id,
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE CASCADE;

-- Recreate index
DROP INDEX IF EXISTS notifications_teacher_id_idx;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);

-- Drop old policies
DROP POLICY IF EXISTS "Teachers can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Teachers can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Teachers can update their own notifications" ON notifications;

-- Create new policies for user_id
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

-- 2. Update essay_activities table
ALTER TABLE essay_activities 
  DROP COLUMN IF EXISTS teacher_id,
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE SET NULL;

-- Recreate index
CREATE INDEX IF NOT EXISTS essay_activities_user_id_idx ON essay_activities(user_id);

-- Drop old policies
DROP POLICY IF EXISTS "Teachers can view their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can create activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can update their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can delete their own activities" ON essay_activities;

-- Create new policies for user_id
CREATE POLICY "Users can view their own activities" 
ON essay_activities FOR SELECT TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can create activities" 
ON essay_activities FOR INSERT TO authenticated WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can update their own activities" 
ON essay_activities FOR UPDATE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
) WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can delete their own activities" 
ON essay_activities FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
