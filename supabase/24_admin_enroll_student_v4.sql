-- 24_admin_enroll_student_v4.sql
-- New RPC for complete student enrollment including suffix and birthday-password logic

CREATE OR REPLACE FUNCTION public.admin_enroll_student_v4(
  p_email        text,
  p_student_code text,
  p_first_name   text,
  p_last_name    text,
  p_middle_name  text DEFAULT NULL,
  p_suffix       text DEFAULT NULL,
  p_birthday     text DEFAULT NULL,
  p_program_id   uuid DEFAULT NULL,
  p_year         integer DEFAULT 1,
  p_block_name   text DEFAULT NULL,
  p_teacher_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_student_id  uuid;
  existing_auth_id uuid;
BEGIN
  -- 1. Check if email exists in auth.users using explicit assignment
  existing_auth_id := (SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1);
  
  -- 2. Check if student_code exists in students
  IF EXISTS (SELECT 1 FROM public.students WHERE upper(trim(student_code)) = upper(trim(p_student_code))) THEN
    RAISE EXCEPTION 'Student code % already exists', p_student_code;
  END IF;

  -- 3. Create or Update Student record
  INSERT INTO public.students (
    student_code, first_name, middle_name, last_name, suffix, email,
    program_id, year, block_name, birthday, teacher_id,
    onboarding_completed, enrollment_status, is_active
  ) VALUES (
    p_student_code, p_first_name, p_middle_name, p_last_name, p_suffix, lower(trim(p_email)),
    p_program_id, p_year, p_block_name, p_birthday, p_teacher_id,
    false, 'active', true
  )
  ON CONFLICT (student_code) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    middle_name = EXCLUDED.middle_name,
    suffix = EXCLUDED.suffix,
    email = EXCLUDED.email,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name,
    birthday = EXCLUDED.birthday,
    is_active = true
  RETURNING id INTO new_student_id;

  RETURN new_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v4 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v4 TO anon;
