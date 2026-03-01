--------------------------------------------------------------------------------
-- Quick Fix for Infinite Recursion Error
-- Run this immediately if you're experiencing:
-- "infinite recursion detected in policy for relation 'users'"
--------------------------------------------------------------------------------

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can delete any user" ON users;

-- Step 2: Create the is_admin() function with SECURITY DEFINER
-- This allows the function to bypass RLS when checking if a user is admin
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

-- Step 3: Recreate the policies using the function
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete any user"
ON users FOR DELETE
TO authenticated
USING (is_admin());

-- Done! The infinite recursion error should now be fixed.
-- Make sure you have at least one user with role = 'admin':
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
