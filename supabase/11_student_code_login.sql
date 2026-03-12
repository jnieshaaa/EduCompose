--------------------------------------------------------------------------------
-- Migration: Student login via student_code
-- Purpose:
-- 1) Allow login screen to resolve student_code -> email securely
-- 2) Keep passwords in Supabase Auth (auth.users)
--------------------------------------------------------------------------------

-- SECURITY DEFINER function so anon users can resolve login email
-- without broad SELECT access to students table.
DROP FUNCTION IF EXISTS public.get_student_login_email(text);

CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_code text)
RETURNS TABLE (
  student_id bigint,
  student_code text,
  email text,
  first_name text,
  middle_name text,
  last_name text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.student_code,
    s.email,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.is_active
  FROM students s
  WHERE lower(trim(s.student_code)) = lower(trim(p_student_code))
    AND s.email IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_student_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO anon, authenticated;
