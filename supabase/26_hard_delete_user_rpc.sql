-- RPC to perform hard delete of a user (Auth + Public)
-- This allows Admins to completely remove a user from the system.

BEGIN;

CREATE OR REPLACE FUNCTION public.hard_delete_user_v1(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  -- 1. Check if the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- 2. Delete from auth.users (This should cascade to public.users and other tables if FKs are CASCADE)
  -- Note: We delete from auth.users specifically because public.users is usually linked to it.
  DELETE FROM auth.users WHERE id = p_user_id;
  
  -- 3. Fallback: Ensure public.users is also gone (in case FK was SET NULL or missing)
  DELETE FROM public.users WHERE id = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.hard_delete_user_v1 TO authenticated;

COMMIT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
