--------------------------------------------------------------------------------
-- 13_fix_student_auth.sql
-- 1. Updates admin_enroll_student_atomic to include auth.identities
-- 2. Creates admin_enroll_student_v2 (used by frontend)
-- 3. Repairs existing student accounts that are missing auth identities
--------------------------------------------------------------------------------

BEGIN;

-- Function to ensure identities exist for an auth user
DROP FUNCTION IF EXISTS public.repair_user_identity(uuid, text);
CREATE OR REPLACE FUNCTION public.repair_user_identity(p_user_id uuid, p_email text)
RETURNS void AS $$
BEGIN
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT 
    p_user_id,
    p_user_id,
    format('{"sub":"%s", "email":"%s"}', p_user_id, lower(trim(p_email)))::jsonb,
    'email',
    p_user_id::text, -- provider_id (Must be text for Supabase internal queries)
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = p_user_id AND provider = 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated Enrollment Function (v2)
DROP FUNCTION IF EXISTS public.admin_enroll_student_v2(text, text, text, text, text, uuid, uuid, integer, text, text);
DROP FUNCTION IF EXISTS public.admin_enroll_student_v2(text, text, text, text, text, text, text, integer, text, text);
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v2(
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
  -- 1. Check if auth user already exists
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = lower(trim(p_email));

  IF v_new_user_id IS NULL THEN
    -- Create new auth user
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

    -- Create identity (CRITICAL for signInWithPassword)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_new_user_id,
      v_new_user_id,
      format('{"sub":"%s", "email":"%s"}', v_new_user_id, lower(trim(p_email)))::jsonb,
      'email',
      v_new_user_id::text, -- provider_id
      now(),
      now(),
      now()
    );
  ELSE
    -- Update existing user password and metadata
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'student'),
      updated_at = now()
    WHERE id = v_new_user_id;

    -- Ensure identity exists
    PERFORM public.repair_user_identity(v_new_user_id, p_email);
  END IF;

  -- 2. Create or Update student profile
  INSERT INTO public.students (
    student_code, first_name, middle_name, last_name, email,
    teacher_id, program_id, year, block_name, auth_user_id
  ) VALUES (
    p_student_code, p_first_name, p_middle_name, p_last_name, lower(trim(p_email)),
    p_teacher_id, p_program_id, p_year, p_block_name, v_new_user_id
  )
  ON CONFLICT (student_code) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    middle_name = EXCLUDED.middle_name,
    email = EXCLUDED.email,
    teacher_id = EXCLUDED.teacher_id,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name,
    auth_user_id = v_new_user_id
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

-- Repair existing students
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT auth_user_id, email FROM public.students WHERE auth_user_id IS NOT NULL) LOOP
    PERFORM public.repair_user_identity(r.auth_user_id, r.email);
  END LOOP;
END;
$$;

-- Provision Student Account Function
DROP FUNCTION IF EXISTS public.admin_provision_student(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_provision_student(uuid, text, text, text, text, text); -- Just in case variation
CREATE OR REPLACE FUNCTION public.admin_provision_student(
  p_email        text,
  p_password     text,
  p_first_name   text,
  p_last_name    text,
  p_student_code text,
  p_middle_name  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_new_user_id uuid;
BEGIN
  -- 1. Check if auth user already exists
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = lower(trim(p_email));

  IF v_new_user_id IS NULL THEN
    -- Create new auth user
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

    -- Create identity
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_new_user_id,
      v_new_user_id,
      format('{"sub":"%s", "email":"%s"}', v_new_user_id, lower(trim(p_email)))::jsonb,
      'email',
      v_new_user_id::text, -- provider_id
      now(),
      now(),
      now()
    );
  ELSE
    -- Update existing user
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'student'),
      updated_at = now()
    WHERE id = v_new_user_id;

    PERFORM public.repair_user_identity(v_new_user_id, p_email);
  END IF;

  RETURN v_new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_student(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v2(text, text, text, text, text, uuid, uuid, integer, text, text) TO authenticated;

--------------------------------------------------------------------------------
-- admin_enroll_student_v3
-- Standard version that only creates student profiles (Deferred Auth)
-- Used by UnifiedStudentUploadService to avoid 500 database errors.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v3(
  p_email        text,
  p_password     text, -- ignored but kept for compatibility
  p_first_name   text,
  p_last_name    text,
  p_student_code text,
  p_teacher_id   uuid,
  p_program_id   uuid,
  p_year         integer,
  p_block_name   text,
  p_middle_name  text DEFAULT NULL,
  p_birthday     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_student_id  uuid;
BEGIN
  INSERT INTO public.students (
    student_code, first_name, middle_name, last_name, email,
    teacher_id, program_id, year, block_name, birthday,
    onboarding_completed
  ) VALUES (
    p_student_code, p_first_name, p_middle_name, p_last_name, lower(trim(p_email)),
    p_teacher_id, p_program_id, p_year, p_block_name, p_birthday,
    false
  )
  ON CONFLICT (student_code) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    middle_name = EXCLUDED.middle_name,
    email = EXCLUDED.email,
    teacher_id = EXCLUDED.teacher_id,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name,
    birthday = EXCLUDED.birthday
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v3 TO authenticated;

COMMIT;
