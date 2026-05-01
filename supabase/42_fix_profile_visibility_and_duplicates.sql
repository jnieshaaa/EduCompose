-- Migration: Fix student profile visibility for teachers and admins
-- Also adds a unique constraint to block_students to prevent duplicates.

BEGIN;

-- 1. Update Student Profiles RLS
DROP POLICY IF EXISTS "Teachers and Admins can view student profiles" ON public.student_profiles;
CREATE POLICY "Teachers and Admins can view student profiles" ON public.student_profiles
FOR SELECT TO authenticated
USING (
    public.check_is_teacher() 
    OR public.check_is_admin()
    OR auth.uid() = user_id
);

-- 2. Prevent duplicates in block_students
-- First, clean up existing duplicates (keeping only the oldest one)
DELETE FROM public.block_students a USING (
  SELECT MIN(ctid) as keep_ctid, block_id, student_id
  FROM public.block_students
  GROUP BY block_id, student_id
  HAVING COUNT(*) > 1
) b
WHERE a.block_id = b.block_id 
  AND a.student_id = b.student_id 
  AND a.ctid <> b.keep_ctid;

-- Add unique constraint
ALTER TABLE public.block_students DROP CONSTRAINT IF EXISTS unique_block_student;
ALTER TABLE public.block_students ADD CONSTRAINT unique_block_student UNIQUE (block_id, student_id);

COMMIT;

NOTIFY pgrst, 'reload schema';
