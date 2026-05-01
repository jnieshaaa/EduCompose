-- ==========================================
-- 40_STUDENT_ENROLLMENT_FIXES_V1.SQL
-- Purpose: Finalized enrollment logic, optimized login lookup, and RLS security.
-- ==========================================

BEGIN;

-- 1. ENROLLMENT & PROVISIONING FUNCTION (Admin-led)
-- Saves Birthday to users and Academic info to student_profiles
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, date, text, integer, text);
CREATE OR REPLACE FUNCTION public.create_new_portal_user_v1(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_middle_name text DEFAULT NULL,
  p_suffix text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_nickname text DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_program_id uuid DEFAULT NULL,
  p_birthday date DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_block_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user exists in Auth (Admin should have created it via Admin API)
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'USER_NOT_FOUND: Please ensure the Auth account exists for %', p_email;
  END IF;

  -- Sync to public.users (Birthday belongs here)
  INSERT INTO public.users (id, email, first_name, last_name, role, middle_name, suffix, birthday)
  VALUES (v_user_id, p_email, p_first_name, p_last_name, p_role, p_middle_name, p_suffix, p_birthday)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    birthday = EXCLUDED.birthday;

  -- Sync to student_profiles (Academic info belongs here)
  IF p_role = 'student' THEN
    INSERT INTO public.student_profiles (
      user_id, student_code, school_id, department_id, program_id, year, block_name
    ) VALUES (
      v_user_id, p_code, p_school_id, p_department_id, p_program_id, p_year, p_block_name
    )
    ON CONFLICT (user_id) DO UPDATE SET
      student_code = EXCLUDED.student_code,
      school_id = EXCLUDED.school_id,
      department_id = EXCLUDED.department_id,
      program_id = EXCLUDED.program_id,
      year = EXCLUDED.year,
      block_name = EXCLUDED.block_name;
  END IF;

  RETURN v_user_id;
END;
$$;

-- 2. OPTIMIZED STUDENT LOGIN LOOKUP (Instant Onboarding Support)
-- Fetches Program and Department names in one go for speed
DROP FUNCTION IF EXISTS public.get_student_login_email_v1(text);
CREATE OR REPLACE FUNCTION public.get_student_login_email_v1(p_student_code text)
RETURNS TABLE (
    id uuid,
    student_code text,
    email text,
    first_name text,
    middle_name text,
    last_name text,
    is_active boolean,
    onboarding_completed boolean,
    birthday text,
    is_provisioned boolean,
    program_name text,
    department_name text,
    year integer,
    block_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, 
        sp.student_code, 
        u.email, 
        u.first_name, 
        u.middle_name, 
        u.last_name, 
        u.is_active, 
        sp.onboarding_completed, 
        u.birthday,
        EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = u.id) as is_provisioned,
        pl.name as program_name,
        dept.name as department_name,
        sp.year,
        sp.block_name
    FROM public.users u
    JOIN public.student_profiles sp ON sp.user_id = u.id
    LEFT JOIN public.programs_lookup pl ON pl.id = sp.program_id
    LEFT JOIN public.departments dept ON dept.id = sp.department_id
    WHERE (sp.student_code = p_student_code OR sp.student_code = UPPER(REPLACE(p_student_code, ' ', '')))
      AND u.role = 'student';
END;
$$;

-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures students can read their own profiles and lookup tables

-- 3.1 Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3.2 Student Profiles table
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
CREATE POLICY "Students can view their own profile" ON public.student_profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update their own profile" ON public.student_profiles;
CREATE POLICY "Students can update their own profile" ON public.student_profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3.3 Lookup Tables (Read-only for all students)
ALTER TABLE public.programs_lookup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view programs" ON public.programs_lookup;
CREATE POLICY "Anyone can view programs" ON public.programs_lookup FOR SELECT TO authenticated USING (true);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT TO authenticated USING (true);

COMMIT;
