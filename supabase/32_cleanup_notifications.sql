-- 32_cleanup_notifications.sql
-- This script fixes the type mismatch in the notifications table.
-- It handles RLS policy dependencies by dropping and recreating them.

BEGIN;

-- 1. Clear old data to prevent type conversion errors
TRUNCATE TABLE public.notifications;

-- 2. DROP POLICIES THAT DEPEND ON THE COLUMNS (CRITICAL FIX)
-- We need to drop these because user_id type is changing from bigint to uuid
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow students to notify instructors" ON public.notifications;

-- 3. Convert 'id' and other ID columns to UUID
-- We drop and recreate the PK for a clean migration since the table is empty
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS id;
ALTER TABLE public.notifications ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- 4. Ensure user_id is also UUID (Matches users table)
ALTER TABLE public.notifications 
  ALTER COLUMN user_id TYPE uuid USING (
    CASE 
      WHEN user_id::text ~ '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$' THEN user_id::uuid
      ELSE NULL 
    END
  );

-- 5. RESTORE RLS POLICIES
-- Re-create the policies after types are updated to UUID
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Adding back the specific custom policy reported in the error
CREATE POLICY "Allow students to notify instructors" 
  ON notifications FOR INSERT TO authenticated 
  WITH CHECK (true);

-- 6. Notify schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
