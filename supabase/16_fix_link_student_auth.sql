-- Drop the old mismatched index (integer)
DROP FUNCTION IF EXISTS public.link_student_auth(integer, uuid);
DROP FUNCTION IF EXISTS public.link_student_auth_by_email(integer, text);

-- Create with correct UUID type for student_id
CREATE OR REPLACE FUNCTION public.link_student_auth(p_student_id uuid, p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students
  SET auth_user_id = p_auth_user_id
  WHERE id = p_student_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.link_student_auth(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_auth(uuid, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.link_student_auth_by_email(p_student_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  -- Find the auth user id by email
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    UPDATE public.students
    SET auth_user_id = v_auth_user_id
    WHERE id = p_student_id;
  ELSE
    RAISE EXCEPTION 'Auth user not found for email %', p_email;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.link_student_auth_by_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_student_auth_by_email(uuid, text) TO anon;

-- Force postgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
