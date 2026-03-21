-- Migration: Allow students to notify instructors
-- Students need to send notifications when they submit an essay or request resubmission.

CREATE POLICY "Allow students to notify instructors"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Case 1: Inserting a notification for someone else (instructors)
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
        AND role = 'student'
      )
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = user_id -- Correctly compare UUID with UUID
        AND role IN ('teacher', 'admin')
      )
    )
    OR
    -- Case 2: Standard policy (inserting for self) - handled by existing policy
    (auth.uid() = user_id) -- Compare UUID with UUID
  );
