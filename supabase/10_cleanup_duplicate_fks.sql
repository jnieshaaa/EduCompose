-- 10_CLEANUP_DUPLICATE_FKS.SQL
-- Purpose: Remove duplicate foreign keys that cause PostgREST join ambiguity (PGRST201)
-- Author: Antigravity

BEGIN;

-- 1. Remove duplicate FKs from block_students to users
-- We keep 'fk_student' as it's the standard in the logic file, or just keep one.
-- Actually, let's standardize on 'fk_block_students_user' from the security patch if it exists,
-- but the error happens because both exist.

ALTER TABLE IF EXISTS public.block_students DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE IF EXISTS public.block_students DROP CONSTRAINT IF EXISTS fk_block_students_user;

-- Re-create a single clean constraint
ALTER TABLE public.block_students 
ADD CONSTRAINT fk_block_students_user 
FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Check for other duplicates (optional but safe)
-- teacher_course_loads to users
ALTER TABLE IF EXISTS public.teacher_course_loads DROP CONSTRAINT IF EXISTS fk_teacher;
ALTER TABLE IF EXISTS public.teacher_course_loads DROP CONSTRAINT IF EXISTS fk_teacher_course_loads_user;

ALTER TABLE public.teacher_course_loads
ADD CONSTRAINT fk_teacher_course_loads_user
FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- teacher_program_loads to users
-- Note: teacher_program_loads usually references teacher_course_loads, but let's check.

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
