--------------------------------------------------------------------------------
-- Add Admin Policies
-- This allows admin users to view and manage all users
--------------------------------------------------------------------------------

-- Create a function to check if current user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Add policy for admins to view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (is_admin());

-- Add policy for admins to update any user
DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Add policy for admins to delete any user
DROP POLICY IF EXISTS "Admins can delete any user" ON users;
CREATE POLICY "Admins can delete any user"
ON users FOR DELETE
TO authenticated
USING (is_admin());

-- Note: Admin functions like deleteUser and resetUserPassword use supabase.auth.admin
-- which requires a service_role key, not the anon key
-- Make sure your frontend uses the service_role key for admin operations
-- or implement these operations server-side with proper authentication
