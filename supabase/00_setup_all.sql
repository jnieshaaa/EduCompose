--------------------------------------------------------------------------------
-- Complete Supabase Setup Script
-- Run this entire script in Supabase Dashboard → SQL Editor
-- This creates all necessary tables, triggers, and policies for EduCompose
--------------------------------------------------------------------------------

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id           bigserial PRIMARY KEY,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text UNIQUE NOT NULL,
  full_name    text,
  first_name   text,
  middle_name  text,
  last_name    text,
  suffix       text,
  title        text,
  nickname     text,
  role         text NOT NULL DEFAULT 'teacher',
  is_active    boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
TO authenticated 
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
TO authenticated 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Allow user creation via trigger" ON users;
CREATE POLICY "Allow user creation via trigger" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO authenticated;

-- 2. SIGNUP VERIFICATION CODES TABLE
CREATE TABLE IF NOT EXISTS signup_verification_codes (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_verification_codes_email_idx ON signup_verification_codes(email);
CREATE INDEX IF NOT EXISTS signup_verification_codes_expires_idx ON signup_verification_codes(expires_at);

ALTER TABLE signup_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert signup codes" ON signup_verification_codes;
CREATE POLICY "Allow anon insert signup codes"
  ON signup_verification_codes FOR INSERT
  TO anon
  WITH CHECK (true);

DROP FUNCTION IF EXISTS verify_signup_code(text, text);
CREATE OR REPLACE FUNCTION verify_signup_code(p_email text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_found boolean;
BEGIN
  WITH deleted AS (
    DELETE FROM signup_verification_codes
    WHERE email = lower(trim(p_email))
      AND code = p_code
      AND expires_at > now()
    RETURNING 1
  )
  SELECT EXISTS(SELECT 1 FROM deleted) INTO v_found;
  RETURN COALESCE(v_found, false);
END;
$$;

GRANT EXECUTE ON FUNCTION verify_signup_code(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_signup_code(text, text) TO authenticated;

-- 3. AUTO-CREATE USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id,
    email,
    full_name,
    first_name,
    middle_name,
    last_name,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'teacher'
    ),
    true
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. ADMIN POLICIES
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

--------------------------------------------------------------------------------
-- DONE! Your Supabase database is now ready for EduCompose
-- 
-- Next steps:
-- 1. Disable "Confirm email" in Authentication → Settings (if using custom verification)
-- 2. Test signup from your frontend
-- 3. Promote a user to admin role: UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
--------------------------------------------------------------------------------
