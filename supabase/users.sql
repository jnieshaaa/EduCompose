--------------------------------------------------------------------------------
-- Users table
-- Stores user information linked to Supabase auth.users
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id           bigserial PRIMARY KEY,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text UNIQUE NOT NULL,
  full_name    text,
  first_name   text,
  middle_name  text,
  last_name    text,
  suffix       text,
  title        text, -- mr, ms, mrs, sir, prof, etc.
  nickname     text, -- custom nickname/title
  role         text NOT NULL DEFAULT 'teacher',
  is_active    boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
TO authenticated 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
TO authenticated 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Allow user creation via trigger" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

