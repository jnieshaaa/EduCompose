--------------------------------------------------------------------------------
-- Migration: Ensure Students exist in the users table for notifications
--------------------------------------------------------------------------------

-- 1. Update handle_new_user function to include students in the users table
-- This allows them to have a bigint ID and receive notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Insert/Update the 'users' table record for everyone (teachers, students, etc.)
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
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'), -- Default to student if not specified
    true
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

  -- 2. If role is student, also update the specific 'students' table link
  IF (NEW.raw_user_meta_data->>'role' = 'student') THEN
    UPDATE public.students 
    SET auth_user_id = NEW.id 
    WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Retroactively add existing students to the users table
-- We fetch them matching by email or auth_user_id
INSERT INTO public.users (auth_user_id, email, first_name, middle_name, last_name, role)
SELECT 
    auth_user_id, 
    email, 
    first_name, 
    middle_name, 
    last_name, 
    'student' as role
FROM students
WHERE auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE SET role = 'student';

-- 3. Relax RLS on notifications if needed (already done in 26_teacher_notifications)
