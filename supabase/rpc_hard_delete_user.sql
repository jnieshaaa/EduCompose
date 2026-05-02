-- 1. [EMERGENCY CLEANUP] Hard Delete User
-- Use this to "flush" corrupted records that cannot be deleted via UI.
CREATE OR REPLACE FUNCTION public.hard_delete_user_v2(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_code text;
BEGIN
  IF p_user_id IS NOT NULL THEN
    -- Get identifiers before deletion for thorough cleanup
    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
    SELECT student_code INTO v_code FROM public.student_profiles WHERE user_id = p_user_id;

    -- Cleanup all possible traces
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    DELETE FROM public.student_profiles WHERE user_id = p_user_id;
    DELETE FROM public.teacher_profiles WHERE user_id = p_user_id;
    DELETE FROM public.admin_profiles WHERE user_id = p_user_id;
    
    -- Cleanup pending registrations (Ghost records)
    IF v_email IS NOT NULL THEN
      DELETE FROM public.pending_student_registrations WHERE lower(email) = lower(v_email);
    END IF;
    IF v_code IS NOT NULL THEN
      DELETE FROM public.pending_student_registrations WHERE student_code = v_code;
    END IF;

    DELETE FROM public.users WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.hard_delete_user_v2(uuid) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
