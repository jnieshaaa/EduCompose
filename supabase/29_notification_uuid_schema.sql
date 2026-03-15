--------------------------------------------------------------------------------
-- Migration: Polymorphic Notifications using UUIDs
--------------------------------------------------------------------------------

DO $$ 
DECLARE
    pol record;
BEGIN
    -- 1. DYNAMICALLY DROP ALL POLICIES on notifications table
    -- This ensures we catch any policies that reference the user_id column
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname);
    END LOOP;

    -- 2. DROP CONSTRAINTS
    ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

    -- 3. CHANGE COLUMN TYPE TO UUID
    -- We convert to UUID. We use USING NULL to avoid conversion errors if old data is invalid integers.
    ALTER TABLE notifications ALTER COLUMN user_id TYPE uuid USING NULL;

    -- 4. CREATE NEW POLICIES (Simpler and more inclusive)
    -- This works for anyone logged in (teacher or student)
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Allow teachers to insert notifications for anyone"
      ON notifications FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE auth_user_id = auth.uid()
          AND role IN ('teacher', 'admin')
        )
      );

    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

END $$;

COMMENT ON COLUMN notifications.user_id IS 'The auth_user_id (UUID) of the recipient (works for both teachers and students)';
