-- Update provisioning RPC to support program_id and ensure all fields are synced
-- Version: v2.0

BEGIN;

-- Drop existing to update signature
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_new_portal_user_v1(
  p_email         text,
  p_password      text,
  p_first_name    text,
  p_last_name     text,
  p_role          text,
  p_middle_name   text DEFAULT NULL,
  p_suffix        text DEFAULT NULL,
  p_title         text DEFAULT NULL, 
  p_nickname      text DEFAULT NULL,
  p_school_id     uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_program_id    uuid DEFAULT NULL,
  p_birthday      text DEFAULT NULL,
  p_code          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_existing_role text;
  v_instance_id uuid;
  v_final_code text;
BEGIN
  -- Get instance ID
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN v_instance_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- Resolve code (student_code or teacher_code)
  v_final_code := lower(trim(COALESCE(p_code, CASE WHEN p_role = 'student' THEN p_title ELSE NULL END)));

  -- 1. Check if profile already exists
  SELECT id, role INTO v_user_id, v_existing_role FROM public.users 
  WHERE email = lower(trim(p_email)) 
     OR (p_role = 'student' AND lower(trim(student_code)) = v_final_code)
  LIMIT 1;

  -- SAFETY CHECK: Prevent role hijacking
  IF v_user_id IS NOT NULL AND v_existing_role <> p_role THEN
    RAISE EXCEPTION 'Role mismatch: Account already exists as a %. Please contact support.', v_existing_role;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- 2. Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
    now(), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']), 
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role),
    false, now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
    updated_at = now()
    WHERE (auth.users.raw_user_meta_data->>'role' = p_role OR auth.users.raw_user_meta_data->>'role' IS NULL);

  -- 3. Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 
    v_user_id, 
    jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email))), 
    'email', 
    lower(trim(p_email)), 
    now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO UPDATE SET
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  -- 4. Sync to public.users (Including program_id, school_id, department_id, birthday)
  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name, suffix, title, nickname,
    role, school_id, department_id, program_id, birthday, is_active, student_code
  ) VALUES (
    v_user_id, lower(trim(p_email)), p_first_name, p_middle_name, p_last_name, p_suffix, 
    CASE WHEN p_role = 'student' THEN NULL ELSE p_title END, 
    p_nickname,
    p_role, p_school_id, p_department_id, p_program_id, p_birthday, true,
    v_final_code
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    suffix = EXCLUDED.suffix,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    department_id = EXCLUDED.department_id,
    program_id = EXCLUDED.program_id,
    birthday = EXCLUDED.birthday,
    student_code = COALESCE(users.student_code, EXCLUDED.student_code),
    is_active = EXCLUDED.is_active;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_portal_user_v1 TO authenticated, anon;

COMMIT;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
