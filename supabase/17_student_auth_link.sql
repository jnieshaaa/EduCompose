--------------------------------------------------------------------------------
-- Migration: Add auth_user_id to students and update link trigger
--------------------------------------------------------------------------------

-- 1. Add auth_user_id column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS students_auth_user_id_idx ON students(auth_user_id);

-- 2. Update handle_new_user trigger to handle students
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- If role is student, we update the existing student record instead of creating a new 'user' entry
  IF (NEW.raw_user_meta_data->>'role' = 'student') THEN
    UPDATE public.students 
    SET auth_user_id = NEW.id 
    WHERE email = NEW.email;
  ELSE
    -- Default behavior for teachers/admins
    INSERT INTO public.users (
      auth_user_id,
      email,
      first_name,
      middle_name,
      last_name,
      role,
      is_active
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'middle_name',
      NEW.raw_user_meta_data->>'last_name',
      COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
      true
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
