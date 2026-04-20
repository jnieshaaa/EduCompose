-- 26_fix_student_self_signup.sql
-- Problem: Students signing up via OTP verification call supabase.auth.signUp()
-- which creates an UNCONFIRMED auth user, so signInWithPassword fails afterward.
--
-- Fix: Grant the EXISTING admin_provision_student function (SECURITY DEFINER,
-- already inserts into auth.users with email_confirmed_at = now()) to the anon
-- role so unauthenticated students can call it during self-signup.
-- link_student_auth is already granted to anon.

-- Allow unauthenticated (anon) students to provision their own confirmed auth account
GRANT EXECUTE ON FUNCTION public.admin_provision_student(text, text, text, text, text, text) TO anon;

-- Ensure link_student_auth is accessible to anon (idempotent)
GRANT EXECUTE ON FUNCTION public.link_student_auth(uuid, uuid) TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
