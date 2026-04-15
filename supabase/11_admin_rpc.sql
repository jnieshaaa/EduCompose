--------------------------------------------------------------------------------
-- 11_admin_rpc.sql — Admin Helper Functions
--------------------------------------------------------------------------------

-- Atomic Student Enrollment: Creates auth user and linked student profile
CREATE OR REPLACE FUNCTION public.admin_enroll_student_atomic(
  p_email        text,
  p_password     text,
  p_first_name   text,
  p_last_name    text,
  p_student_code text,
  p_teacher_id   uuid,
  p_program_id   uuid,
  p_year         integer,
  p_block_name   text,
  p_middle_name  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_new_user_id uuid;
  v_student_id  uuid;
BEGIN
  -- 1. Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
    now(), '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'student'),
    now(), now(), '', '', '', false
  )
  RETURNING id INTO v_new_user_id;

  -- 2. Create student profile
  INSERT INTO public.students (
    student_code, first_name, middle_name, last_name, email,
    teacher_id, program_id, year, block_name, auth_user_id
  ) VALUES (
    p_student_code, p_first_name, p_middle_name, p_last_name, lower(trim(p_email)),
    p_teacher_id, p_program_id, p_year, p_block_name, v_new_user_id
  )
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student_atomic TO authenticated;

