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
    updated_at         = now()
  WHERE email = lower(trim(p_email));

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_student_password(text, text) TO authenticated;
