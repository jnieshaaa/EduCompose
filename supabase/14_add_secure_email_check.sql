-- 14_ADD_SECURE_EMAIL_CHECK.SQL
-- Purpose: Allow anonymous users to check if an email exists without exposing user profiles via RLS
-- This is necessary for the Forgot Password flow.

BEGIN;

-- Create a secure function to check if an email exists
-- SECURITY DEFINER allows this function to run with the privileges of the creator (bypass RLS)
CREATE OR REPLACE FUNCTION public.check_user_email_exists(p_email text)
RETURNS TABLE (user_exists boolean, user_role text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true as user_exists,
        u.role::text as user_role
    FROM public.users u
    WHERE u.email = lower(trim(p_email))
    LIMIT 1;
END;
$$;

-- Grant access to the function for both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.check_user_email_exists(text) TO anon, authenticated;

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
