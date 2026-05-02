-- 6. [LOGIN] Staff Validation (Teacher/Admin)
-- Pre-login check to ensure correct role and active status.
DROP FUNCTION IF EXISTS public.api_validate_staff_credentials(text);

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

GRANT EXECUTE ON FUNCTION public.api_validate_staff_credentials(text) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
