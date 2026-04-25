-- Comprehensive Security & Notification Fix (v2.9)
-- Resolves Admin notification visibility and Teacher-to-Admin lookup
-- Author: Antigravity

BEGIN;

-- 1. Allow all authenticated users to see the list of Admins
-- This is necessary so Teachers can find Admin IDs to send them notifications
DROP POLICY IF EXISTS "Authenticated users can see admins" ON public.users;
CREATE POLICY "Authenticated users can see admins" ON public.users
FOR SELECT TO authenticated
USING (role = 'admin');

-- 2. Ensure Notifications can be inserted by anyone for anyone (already exists but re-applying for safety)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Ensure Admins can see all notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" ON public.notifications
FOR ALL TO authenticated
USING (public.check_is_admin());

COMMIT;
NOTIFY pgrst, 'reload schema';
