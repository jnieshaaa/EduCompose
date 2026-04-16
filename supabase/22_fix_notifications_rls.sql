-- 22_fix_notifications_rls.sql
-- Allow teachers to send notifications to students and fix general notification permissions.

-- 1. Allow authenticated users (teachers) to insert notifications for other users
-- In a real production app, you might want to restrict this more (e.g., only to students of that teacher)
-- but for now, we'll allow authenticated users to insert notifications.
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow insertion if you are authenticated

-- 2. Ensure students can only see/read their own notifications (already exists, but let's be explicit)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
