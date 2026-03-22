-- Allow admins to delete teacher course loads
DROP POLICY IF EXISTS "Admins can delete teacher course loads" ON teacher_course_loads;
CREATE POLICY "Admins can delete teacher course loads"
  ON teacher_course_loads FOR DELETE
  TO authenticated
  USING (is_admin());

-- Allow admins to insert notifications
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
