-- ==========================================
-- 41_FIX_TEACHER_ENROLLMENT_RLS.SQL
-- Purpose: Resolve 403 Forbidden errors and 400 Bad Request (missing column)
-- ==========================================

BEGIN;

-- 1. ENABLE RLS ON PROFILE TABLES
ALTER TABLE IF EXISTS public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 2. TEACHER_PROFILES POLICIES
DROP POLICY IF EXISTS "Admins can do everything on teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Admins can do everything on teacher profiles" 
ON public.teacher_profiles FOR ALL 
TO authenticated 
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Teachers can view own profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can view own profile" 
ON public.teacher_profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can update own profile" 
ON public.teacher_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ADDED: Policy to allow teachers to insert their own profile during onboarding
DROP POLICY IF EXISTS "Teachers can insert own profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can insert own profile" 
ON public.teacher_profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. ADMIN_PROFILES POLICIES
DROP POLICY IF EXISTS "Admins can do everything on admin profiles" ON public.admin_profiles;
CREATE POLICY "Admins can do everything on admin profiles" 
ON public.admin_profiles FOR ALL 
TO authenticated 
USING (public.check_is_admin());

-- 4. UPDATE PROVISIONING RPC
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
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));

  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'USER_NOT_FOUND: Please ensure the Auth account exists for %', p_email;
  END IF;

  INSERT INTO public.users (
    id, email, first_name, last_name, role, middle_name, suffix, birthday
  )
  VALUES (
    v_user_id, lower(trim(p_email)), p_first_name, p_last_name, p_role, p_middle_name, p_suffix, p_birthday
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    middle_name = EXCLUDED.middle_name,
    suffix = EXCLUDED.suffix,
    birthday = EXCLUDED.birthday;

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

  ELSIF p_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (
      user_id, title, nickname, school_id, department_id
    ) VALUES (
      v_user_id, p_title, p_nickname, p_school_id, p_department_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
      title = EXCLUDED.title,
      nickname = EXCLUDED.nickname,
      school_id = EXCLUDED.school_id,
      department_id = EXCLUDED.department_id;

  ELSIF p_role = 'admin' THEN
    INSERT INTO public.admin_profiles (user_id) 
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$;

GRANT ALL ON TABLE public.teacher_profiles TO authenticated;
GRANT ALL ON TABLE public.admin_profiles TO authenticated;
GRANT ALL ON TABLE public.student_profiles TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
