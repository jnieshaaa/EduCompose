-- 27_repair_student_auth_rpc.sql
-- 1. Restores the missing auth_user_id column to get_student_login_email
-- 2. Makes admin_provision_student more compatible with Supabase's identity format

BEGIN;

-- Restore get_student_login_email with all necessary columns
DROP FUNCTION IF EXISTS public.get_student_login_email(text);
CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_code text)
RETURNS TABLE (
  student_id   uuid,
  student_code text,
  email        text,
  first_name   text,
  middle_name  text,
  last_name    text,
  suffix       text,
  is_active    boolean,
  birthday     text,
  onboarding_completed boolean,
  auth_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.student_code,
    s.email,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.suffix,
    s.is_active,
    s.birthday,
    s.onboarding_completed,
    s.auth_user_id
  FROM public.students s
  WHERE upper(trim(s.student_code)) = upper(trim(p_student_code))
    AND s.is_active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO authenticated;

-- Upgrade admin_provision_student to use email as provider_id for better compatibility
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

    -- Create identity (Using email as provider_id for maximum compatibility)
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
      gen_random_uuid(), -- Identity ID should be unique/random
      v_new_user_id,
      format('{"sub":"%s", "email":"%s"}', v_new_user_id, lower(trim(p_email)))::jsonb,
      'email',
      lower(trim(p_email)), -- provider_id = email
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
      email_confirmed_at = COALESCE(email_confirmed_at, now()), -- Ensure confirmed
      updated_at = now()
    WHERE id = v_new_user_id;

    -- Ensure valid identity exists
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_new_user_id AND provider = 'email') THEN
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          v_new_user_id,
          format('{"sub":"%s", "email":"%s"}', v_new_user_id, lower(trim(p_email)))::jsonb,
          'email',
          lower(trim(p_email)),
          now(), now(), now()
        );
    ELSE
        -- Update existing identity data
        UPDATE auth.identities
        SET 
          identity_data = format('{"sub":"%s", "email":"%s"}', v_new_user_id, lower(trim(p_email)))::jsonb,
          provider_id = lower(trim(p_email)),
          updated_at = now()
        WHERE user_id = v_new_user_id AND provider = 'email';
    END IF;
  END IF;

  RETURN v_new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_student(text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_provision_student(text, text, text, text, text, text) TO authenticated;

-- Reload cache
NOTIFY pgrst, 'reload schema';

COMMIT;
