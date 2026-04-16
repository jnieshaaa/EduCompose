--------------------------------------------------------------------------------
-- 14_complete_onboarding_rpc.sql
-- RPC to safely complete student onboarding and link auth_user_id.
-- Bypasses RLS via SECURITY DEFINER.
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  p_student_id   uuid,
  p_auth_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Verify the calling user matches the auth_user_id OR it's a first-time link
  -- For security, we ensure the email of the auth user matches the student email.
  
  UPDATE public.students
  SET 
    auth_user_id = p_auth_user_id,
    onboarding_completed = true,
    updated_at = now()
  WHERE id = p_student_id
    AND email = (SELECT email FROM auth.users WHERE id = p_auth_user_id);

  -- 2. Ensure they exist in public.users as well
  INSERT INTO public.users (auth_user_id, role, first_name, last_name, email)
  SELECT 
    p_auth_user_id, 
    'student', 
    s.first_name, 
    s.last_name, 
    s.email
  FROM public.students s
  WHERE s.id = p_student_id
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    role = 'student',
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(uuid, uuid) TO authenticated;
