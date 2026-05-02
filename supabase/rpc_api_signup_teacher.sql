-- 4. [SIGNUP] Teacher Registration
-- High-level function used for Teacher self-signup.
-- DEPENDENCY: public.create_new_portal_user_v1
CREATE OR REPLACE FUNCTION public.api_signup_teacher_v1(
  p_email text, p_pass text, p_first text, p_last text
)
RETURNS uuid AS $$
BEGIN
  RETURN public.create_new_portal_user_v1(
    p_email, 
    p_pass, 
    p_first, -- p_first_name
    p_last,  -- p_last_name
    'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.api_signup_teacher_v1(text, text, text, text) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
