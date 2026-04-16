DROP FUNCTION IF EXISTS public.get_student_login_email(text);

CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_code text)
RETURNS TABLE (
  student_id   uuid,
  student_code text,
  email        text,
  first_name   text,
  middle_name  text,
  last_name    text,
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

-- Force postgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
