-- ==========================================
-- 45_MODULAR_STABILITY_API_V1.SQL
-- Purpose: Separated, modular functions for Enrollment, Signup, and Login.
-- This file serves as the "Master Key" for the EduCompose Identity System.
-- ==========================================

BEGIN;

-- CLEANUP OLD SIGNATURES
DROP FUNCTION IF EXISTS public.hard_delete_user_v2(uuid);
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, text, text, integer, text);
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, date, text, integer, text);
DROP FUNCTION IF EXISTS public.api_enroll_student_v1(text, text, text, text, text, uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS public.api_signup_teacher_v1(text, text, text, text);
DROP FUNCTION IF EXISTS public.api_validate_student_credentials(text, text);
DROP FUNCTION IF EXISTS public.api_validate_staff_credentials(text);
DROP FUNCTION IF EXISTS public.admin_enroll_student_v4(text, text, text, text, text, text, text, uuid, integer, text, uuid);

-- 1. [EMERGENCY CLEANUP] Hard Delete User
-- Use this to "flush" corrupted records that cannot be deleted via UI.
CREATE OR REPLACE FUNCTION public.hard_delete_user_v2(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    DELETE FROM public.student_profiles WHERE user_id = p_user_id;
    DELETE FROM public.teacher_profiles WHERE user_id = p_user_id;
    DELETE FROM public.admin_profiles WHERE user_id = p_user_id;
    DELETE FROM public.users WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. [CORE ENGINE] Unified Identity Creation
-- The underlying engine used by all enrollment and signup functions.
CREATE OR REPLACE FUNCTION public.create_new_portal_user_v1(
  p_email text, p_password text, p_first text, p_last text, p_role text,
  p_middle text DEFAULT NULL, p_suffix text DEFAULT NULL, p_title text DEFAULT NULL,
  p_nick text DEFAULT NULL, p_school uuid DEFAULT NULL, p_dept uuid DEFAULT NULL,
  p_prog uuid DEFAULT NULL, p_bday text DEFAULT NULL, p_code text DEFAULT NULL,
  p_year integer DEFAULT NULL, p_block text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE email = lower(trim(p_email)) LIMIT 1;
  IF v_uid IS NULL THEN v_uid := gen_random_uuid(); END IF;

  -- Auth Record
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (v_uid, lower(trim(p_email)), crypt(p_password, gen_salt('bf')), now(), 'authenticated', 'authenticated', 
    jsonb_build_object('provider', 'email', 'providers', array['email']), 
    jsonb_build_object('first_name', p_first, 'last_name', p_last, 'role', p_role), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_uid, v_uid, jsonb_build_object('sub', v_uid, 'email', lower(trim(p_email))), 'email', lower(trim(p_email)), now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Public Table
  INSERT INTO public.users (id, email, first_name, middle_name, last_name, role, birthday, is_active)
  VALUES (v_uid, lower(trim(p_email)), p_first, p_middle, p_last, p_role, p_bday, true)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, birthday = EXCLUDED.birthday, is_active = true;

  -- Role Profiles
  IF p_role = 'admin' THEN
    INSERT INTO public.admin_profiles (user_id) VALUES (v_uid) ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (user_id, title, nickname, school_id, department_id, onboarding_completed)
    VALUES (v_uid, p_title, p_nick, p_school, p_dept, false) ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_role = 'student' THEN
    INSERT INTO public.student_profiles (user_id, student_code, school_id, department_id, program_id, year, block_name, onboarding_completed)
    VALUES (v_uid, p_code, p_school, p_dept, p_prog, p_year, p_block, true) ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true;
  END IF;

  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. [ENROLLMENT] Admin-to-Student Enrollment
-- High-level function used by the Admin Panel.
CREATE OR REPLACE FUNCTION public.api_enroll_student_v1(
  p_email text, p_code text, p_first text, p_last text, p_bday text, 
  p_prog uuid, p_yr integer, p_block text, p_teach uuid
)
RETURNS uuid AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public.create_new_portal_user_v1(
    p_email, p_bday, p_first, p_last, 'student', NULL, NULL, NULL, NULL, NULL, NULL, p_prog, p_bday, p_code, p_yr, p_block
  );
  UPDATE public.student_profiles SET teacher_id = p_teach WHERE user_id = v_uid;
  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. [SIGNUP] Teacher Registration
-- High-level function used for Teacher self-signup.
CREATE OR REPLACE FUNCTION public.api_signup_teacher_v1(
  p_email text, p_pass text, p_first text, p_last text
)
RETURNS uuid AS $$
BEGIN
  RETURN public.create_new_portal_user_v1(
    p_email, p_pass, p_first, p_last, 'teacher', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. [LOGIN] Student Validation
-- High-level function for secure, format-agnostic login checks.
CREATE OR REPLACE FUNCTION public.api_validate_student_credentials(
  p_student_code text,
  p_birthday_pass text
)
RETURNS TABLE (
  success boolean,
  message text,
  id uuid,
  email text,
  first_name text,
  last_name text,
  student_code text,
  is_provisioned boolean,
  onboarding_completed boolean,
  is_active boolean,
  birthday text
) AS $$
DECLARE
  v_rec record;
BEGIN
  SELECT 
    u.id, u.email, u.first_name, u.last_name, sp.student_code,
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = u.id) as is_prov,
    sp.onboarding_completed, u.is_active, u.birthday
  INTO v_rec
  FROM public.users u
  JOIN public.student_profiles sp ON sp.user_id = u.id
  WHERE (sp.student_code = p_student_code OR REPLACE(sp.student_code, '-', '') = REPLACE(p_student_code, '-', ''))
    AND u.role = 'student' LIMIT 1;

  IF v_rec.id IS NULL THEN
    RETURN QUERY SELECT false, 'Student ID not found.', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, false, false, false, NULL::text;
  ELSIF v_rec.birthday != p_birthday_pass THEN
    RETURN QUERY SELECT false, 'Invalid password/birthday.', v_rec.id, v_rec.email, v_rec.first_name, v_rec.last_name, v_rec.student_code, v_rec.is_prov, v_rec.onboarding_completed, v_rec.is_active, v_rec.birthday;
  ELSE
    RETURN QUERY SELECT true, 'Credentials valid.', v_rec.id, v_rec.email, v_rec.first_name, v_rec.last_name, v_rec.student_code, v_rec.is_prov, v_rec.onboarding_completed, v_rec.is_active, v_rec.birthday;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. [LOGIN] Staff Validation (Teacher/Admin)
-- Pre-login check to ensure correct role and active status.
CREATE OR REPLACE FUNCTION public.api_validate_staff_credentials(p_email text)
RETURNS TABLE (
  account_exists boolean,
  id uuid,
  role text,
  first_name text,
  last_name text,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true, u.id, u.role, u.first_name, u.last_name, u.is_active
  FROM public.users u
  WHERE u.email = lower(trim(p_email))
    AND u.role IN ('admin', 'teacher')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. LEGACY COMPATIBILITY (Aliasing old names to new ones)
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v4(p_email text, p_student_code text, p_first_name text, p_last_name text, p_middle_name text DEFAULT NULL, p_suffix text DEFAULT NULL, p_birthday text DEFAULT NULL, p_program_id uuid DEFAULT NULL, p_year integer DEFAULT 1, p_block_name text DEFAULT NULL, p_teacher_id uuid DEFAULT NULL) 
RETURNS uuid AS $$ SELECT public.api_enroll_student_v1($1, $2, $3, $4, $7, $8, $9, $10, $11); $$ LANGUAGE sql SECURITY DEFINER;

-- Finalize
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
COMMIT;
NOTIFY pgrst, 'reload schema';
