-- 13_FIX_PROGRAMS_LOOKUP_AMBIGUITY.SQL
-- Purpose: Permanently resolve PGRST201 Join Ambiguity for programs_lookup
-- Author: Antigravity

BEGIN;

-- 1. Clean up users table constraints to programs_lookup
-- We drop all known names and any potential default names
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS fk_user_program;
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS fk_users_program;
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_program_id_fkey;

-- 2. Create a single clean constraint
-- We use the name 'fk_user_program' as it was the original intent
ALTER TABLE public.users
ADD CONSTRAINT fk_user_program 
FOREIGN KEY (program_id) REFERENCES public.programs_lookup(id) ON DELETE SET NULL;

-- 3. Also check courses table just in case (though less likely to be ambiguous)
ALTER TABLE IF EXISTS public.courses DROP CONSTRAINT IF EXISTS fk_program;
ALTER TABLE IF EXISTS public.courses DROP CONSTRAINT IF EXISTS courses_program_id_fkey;

ALTER TABLE public.courses
ADD CONSTRAINT fk_course_program
FOREIGN KEY (program_id) REFERENCES public.programs_lookup(id) ON DELETE SET NULL;

-- 4. Check pending_student_registrations
ALTER TABLE IF EXISTS public.pending_student_registrations DROP CONSTRAINT IF EXISTS fk_pending_program;
ALTER TABLE IF EXISTS public.pending_student_registrations DROP CONSTRAINT IF EXISTS pending_student_registrations_program_id_fkey;

ALTER TABLE public.pending_student_registrations
ADD CONSTRAINT fk_pending_program
FOREIGN KEY (program_id) REFERENCES public.programs_lookup(id) ON DELETE CASCADE;

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
