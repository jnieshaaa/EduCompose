-- [CORE ENGINE] Unified Identity Creation (Updated Signature)
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, text, text, integer, text);
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
  p_birthday text DEFAULT NULL, 
  p_code text DEFAULT NULL,
  p_year integer DEFAULT NULL, 
  p_block_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE v_uid uuid;
BEGIN
  -- Search for existing user by email in BOTH tables
  -- Check public.users first
  SELECT id INTO v_uid FROM public.users WHERE lower(trim(email)) = lower(trim(p_email)) LIMIT 1;
  -- Also check auth.users (may have ghost records from incomplete deletes)
  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM auth.users WHERE lower(trim(email)) = lower(trim(p_email)) LIMIT 1;
  END IF;
  IF v_uid IS NULL THEN v_uid := gen_random_uuid(); END IF;

  -- Auto-resolve school and department if not provided but program is available
  IF (p_school_id IS NULL OR p_department_id IS NULL) AND p_program_id IS NOT NULL THEN
    SELECT d.school_id, p.department_id INTO p_school_id, p_department_id
    FROM public.programs_lookup p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = p_program_id;
  END IF;

  -- 1. AUTH RECORD (Supabase Cloud Format)
  -- Delete any existing ghost record first, then re-insert cleanly
  DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE lower(trim(email)) = lower(trim(p_email)) AND id != v_uid
  );
  DELETE FROM auth.users WHERE lower(trim(email)) = lower(trim(p_email)) AND id != v_uid;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    role, aud, raw_app_meta_data, raw_user_meta_data, is_sso_user, 
    created_at, updated_at,
    -- GoTrue requires ALL of these to be non-NULL
    email_change, phone_change, email_change_token_new, 
    email_change_token_current, phone_change_token,
    reauthentication_token, confirmation_token, recovery_token,
    email_change_confirm_status
  )
  VALUES (
    v_uid, '00000000-0000-0000-0000-000000000000', lower(trim(p_email)), 
    crypt(p_password, gen_salt('bf')), now(), 'authenticated', 'authenticated', 
    jsonb_build_object('provider', 'email', 'providers', array['email']), 
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), 
    false, now(), now(),
    '', '', '', '', '', '', '', '', 0
  )
  ON CONFLICT (id) DO UPDATE SET 
    encrypted_password = crypt(p_password, gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role),
    updated_at = now(),
    -- Ensure re-used records have NO NULLs
    email_change = COALESCE(auth.users.email_change, ''),
    phone_change = COALESCE(auth.users.phone_change, ''),
    email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
    email_change_token_current = COALESCE(auth.users.email_change_token_current, ''),
    phone_change_token = COALESCE(auth.users.phone_change_token, ''),
    reauthentication_token = COALESCE(auth.users.reauthentication_token, ''),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change_confirm_status = COALESCE(auth.users.email_change_confirm_status, 0);

  -- 2. IDENTITY RECORD
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, 
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_uid, 
    jsonb_build_object(
      'sub', v_uid, 
      'email', lower(trim(p_email)),
      'email_verified', true,
      'phone_verified', false
    ), 
    'email', lower(trim(p_email)), 
    now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. PUBLIC USERS TABLE
  INSERT INTO public.users (id, email, first_name, middle_name, last_name, role, birthday, is_active)
  VALUES (v_uid, lower(trim(p_email)), p_first_name, p_middle_name, p_last_name, p_role, p_birthday, true)
  ON CONFLICT (email) DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    birthday = EXCLUDED.birthday,
    is_active = true;

  -- 4. ROLE PROFILES
  IF p_role = 'admin' THEN
    INSERT INTO public.admin_profiles (user_id) VALUES (v_uid) ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (user_id, title, nickname, school_id, department_id, onboarding_completed)
    VALUES (v_uid, p_title, p_nickname, p_school_id, p_department_id, false) ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_role = 'student' THEN
    INSERT INTO public.student_profiles (user_id, student_code, school_id, department_id, program_id, year, block_name, onboarding_completed)
    VALUES (v_uid, p_code, p_school_id, p_department_id, p_program_id, p_year, p_block_name, false) 
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, text, text, integer, text) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
