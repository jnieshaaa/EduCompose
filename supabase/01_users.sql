--------------------------------------------------------------------------------
-- 01_users.sql — Users table, auth trigger, admin helpers
--------------------------------------------------------------------------------

-- Users table (mirrors auth.users with app-specific fields)
CREATE TABLE IF NOT EXISTS users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email            text UNIQUE NOT NULL,
  first_name       text,
  middle_name      text,
  last_name        text,
  username         text,
  avatar_url       text,
  role             text NOT NULL DEFAULT 'teacher',
  is_active        boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  school_id        uuid,  -- FK added after schools table exists
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Allow user creation via trigger"
  ON users FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Admin policies
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete any user"
  ON users FOR DELETE TO authenticated USING (is_admin());

-- Auth trigger: auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id, email, first_name, middle_name, last_name, role, is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    true
  )
  ON CONFLICT (email) DO UPDATE
  SET
    auth_user_id = EXCLUDED.auth_user_id,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    middle_name = COALESCE(EXCLUDED.middle_name, users.middle_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    role = COALESCE(EXCLUDED.role, users.role),
    is_active = true
  WHERE users.auth_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
