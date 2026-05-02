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
  ELSIF REPLACE(v_rec.birthday, '-', '') != REPLACE(p_birthday_pass, '-', '') THEN
    RETURN QUERY SELECT false, 'Invalid password/birthday.', v_rec.id, v_rec.email, v_rec.first_name, v_rec.last_name, v_rec.student_code, v_rec.is_prov, v_rec.onboarding_completed, v_rec.is_active, v_rec.birthday;
  ELSE
    RETURN QUERY SELECT true, 'Credentials valid.', v_rec.id, v_rec.email, v_rec.first_name, v_rec.last_name, v_rec.student_code, v_rec.is_prov, v_rec.onboarding_completed, v_rec.is_active, v_rec.birthday;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.api_validate_student_credentials(text, text) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
