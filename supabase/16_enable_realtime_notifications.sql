-- 16_ENABLE_REALTIME_NOTIFICATIONS.SQL
-- Purpose: Explicitly enable Supabase Realtime for the notifications table
-- This allows the frontend to receive updates instantly without page refresh.

-- 1. Ensure the publication exists (Supabase default)
-- 2. Add the notifications table to the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- 3. Ensure RLS is enabled for the table (safety)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Re-verify the INSERT policy for everyone to send notifications
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- 5. Re-verify the SELECT policy for users to see their own notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
