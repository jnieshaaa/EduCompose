-- 11_FIX_STUDENTS_AND_FKS.SQL
-- Purpose: Fix PGRST201 error and sync students with blocks
-- Author: Antigravity

BEGIN;

-- 1. FIX PGRST201: Remove duplicate foreign keys from block_students to users
-- We drop all potential names and recreate one clean constraint.
ALTER TABLE IF EXISTS public.block_students DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE IF EXISTS public.block_students DROP CONSTRAINT IF EXISTS fk_block_students_user;
ALTER TABLE IF EXISTS public.block_students DROP CONSTRAINT IF EXISTS block_students_student_id_fkey;

ALTER TABLE public.block_students 
ADD CONSTRAINT fk_block_students_user 
FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. SYNC STUDENTS: Link students to their respective blocks based on block_name
-- This script will look for students with 'block_name' and match them to blocks with the same 'name'.
INSERT INTO public.block_students (block_id, student_id)
SELECT b.id, u.id
FROM public.users u
JOIN public.blocks b ON LOWER(u.block_name) = LOWER(b.name)
WHERE u.role = 'student'
AND u.block_name IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.block_students bs 
    WHERE bs.student_id = u.id AND bs.block_id = b.id
);

-- 3. CLEANUP: Other potential duplicate FKs
ALTER TABLE IF EXISTS public.teacher_course_loads DROP CONSTRAINT IF EXISTS fk_teacher;
ALTER TABLE IF EXISTS public.teacher_course_loads DROP CONSTRAINT IF EXISTS fk_teacher_course_loads_user;
ALTER TABLE IF EXISTS public.teacher_course_loads DROP CONSTRAINT IF EXISTS teacher_course_loads_teacher_id_fkey;

ALTER TABLE public.teacher_course_loads
ADD CONSTRAINT fk_teacher_course_loads_user
FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
