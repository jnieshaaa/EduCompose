--------------------------------------------------------------------------------
-- Allow teachers to create notifications for other users
--------------------------------------------------------------------------------

-- Since standard users can only insert notifications for themselves,
-- we need a policy to allow teachers to notify their students
CREATE POLICY "Allow teachers to insert notifications for anyone"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );
