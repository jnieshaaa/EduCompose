-- Fix create_new_portal_user_v6 signature mismatch
-- Frontend expects 11 parameters, including school and department IDs.

BEGIN;

-- Drop old v6 to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_new_portal_user_v6(text, text, text, text, text, text, text, text, text);

-- Create new v6 with all 11 parameters
CREATE OR REPLACE FUNCTION public.create_new_portal_user_v6(
  p_email         text,
  p_password      text,
  p_first_name    text,
  p_last_name     text,
  p_role          text,
  p_middle_name   text DEFAULT NULL,
  p_suffix        text DEFAULT NULL,
  p_code          text DEFAULT NULL,
  p_birthday      text DEFAULT NULL,
  p_school_id     uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN public.create_new_portal_user_v1(
    p_email, 
    p_password, 
    p_first_name, 
    p_last_name, 
    p_role, 
    p_middle_name, 
    p_suffix, 
    NULL, -- p_title
    NULL, -- p_nickname
    p_school_id, 
    p_department_id, 
    p_birthday, 
    p_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_portal_user_v6 TO authenticated, anon;

COMMIT;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
