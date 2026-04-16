-- 17_fix_signup_permissions.sql
-- Grant explicit table-level permissions to anon and authenticated roles 
-- so they can insert verification codes, resolving 403 Forbidden.

GRANT INSERT, SELECT ON public.signup_verification_codes TO anon;
GRANT INSERT, SELECT ON public.signup_verification_codes TO authenticated;

-- Ensure RLS is active and allows insert
ALTER TABLE IF EXISTS public.signup_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert signup codes" ON public.signup_verification_codes;
CREATE POLICY "Allow anon insert signup codes" 
  ON public.signup_verification_codes 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure postgREST schema cache reloads Table-Level Grants
NOTIFY pgrst, 'reload schema';
