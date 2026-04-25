-- Comprehensive Security Patch (v2.3)
-- Resolves Student Login "Invalid Credentials" by detecting non-provisioned accounts
-- Author: Antigravity

BEGIN;

-- 1. Ensure get_student_login_email returns the provisioning status
-- This allows the frontend to trigger the Verification flow for new students
CREATE OR REPLACE FUNCTION public.get_student_login_email_v1(p_student_code text)
RETURNS TABLE (
    id uuid,
    student_code text,
    email text,
    first_name text,
    middle_name text,
    last_name text,
    is_active boolean,
    onboarding_completed boolean,
    birthday text,
    is_provisioned boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, u.student_code, u.email, u.first_name, u.middle_name, u.last_name, 
        u.is_active, u.onboarding_completed, u.birthday,
        EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = u.id) as is_provisioned
    FROM public.users u
    WHERE (u.student_code = p_student_code OR u.student_code = UPPER(REPLACE(p_student_code, ' ', '')))
      AND u.role = 'student';
END;
$$;

-- Update the alias as well
CREATE OR REPLACE FUNCTION public.get_student_login_email_v2(p_student_code text)
RETURNS TABLE (
    id uuid, 
    student_code text, 
    email text, 
    first_name text, 
    middle_name text, 
    last_name text, 
    is_active boolean, 
    onboarding_completed boolean, 
    birthday text,
    is_provisioned boolean
) AS $$ 
  SELECT * FROM public.get_student_login_email_v1($1); 
$$ LANGUAGE sql SECURITY DEFINER;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
