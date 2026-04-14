--------------------------------------------------------------------------------
-- 11_admin_rpc.sql — Admin/Teacher privileged RPC functions
-- These use SECURITY DEFINER so they run as postgres (superuser) and can
-- safely touch auth.users without exposing the service-role key to the browser.
--------------------------------------------------------------------------------

-- Reset a student's password (admin or teacher only)
CREATE OR REPLACE FUNCTION public.admin_reset_student_password(
  p_email      text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Only admins or teachers may call this
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Unauthorized: only admins and teachers can reset student passwords';
  END IF;

  -- Update the encrypted password in auth.users
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at         = now()
  WHERE email = lower(trim(p_email));

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_student_password(text, text) TO authenticated;

-- Provision a student account (admin or teacher only)
-- Handles: Auth creation (if needed), password reset, and public profile sync
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
  v_caller_role text;
  v_auth_user_id uuid;
  v_metadata jsonb;
BEGIN
  -- 1. Authorization Check
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Unauthorized: only admins and teachers can provision student accounts';
  END IF;

  v_metadata := jsonb_build_object(
    'role', 'student',
    'first_name', p_first_name,
    'middle_name', p_middle_name,
    'last_name', p_last_name,
    'student_code', p_student_code,
    'full_name', trim(p_first_name || ' ' || COALESCE(p_middle_name || ' ', '') || p_last_name)
  );

  -- 2. Check if auth user exists
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email));

  IF v_auth_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = v_metadata,
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      last_sign_in_at = NULL
    WHERE id = v_auth_user_id;

    -- Manually sync public.users for existing ones (as the INSERT trigger won't fire)
    UPDATE public.users SET
      email = lower(trim(p_email)),
      first_name = p_first_name,
      last_name = p_last_name,
      middle_name = p_middle_name,
      role = 'student',
      is_active = true
    WHERE auth_user_id = v_auth_user_id;
  ELSE
    -- Create new auth user
    v_auth_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      last_sign_in_at,
      is_sso_user,
      is_anonymous
    )
    SELECT
      v_auth_user_id,
      COALESCE((SELECT instance_id FROM auth.users LIMIT 1), '00000000-0000-0000-0000-000000000000'),
      lower(trim(p_email)),
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      v_metadata,
      'authenticated',
      'authenticated',
      now(),
      now(),
      NULL,
      false,
      false;
  END IF;

  -- 3. The public.users sync is handled automatically by the on_auth_user_created trigger
  -- and Supabase's internal metadata sync. We return the ID.
  RETURN v_auth_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_student(text, text, text, text, text, text) TO authenticated;

-- User: Drop existing to ensure correct return type if previously defined differently
DROP FUNCTION IF EXISTS public.get_student_login_email(text);

-- Lookup student email and info by code (needed for the Login screen)
-- Uses SECURITY DEFINER so anonymous users can resolve emails without full table access.
CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_code text)
RETURNS TABLE (
  student_id   uuid,
  student_code text,
  email        text,
  first_name   text,
  middle_name  text,
  last_name    text,
  is_active    boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as student_id,
    s.student_code,
    s.email,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.is_active
  FROM public.students s
  WHERE upper(trim(s.student_code)) = upper(trim(p_student_code))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO authenticated;

