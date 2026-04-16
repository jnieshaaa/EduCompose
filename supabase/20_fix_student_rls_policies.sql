-- 20_fix_student_rls_policies.sql
-- This script adds RLS policies to allow students to view their own classes and related data.
-- Currently, they see 0 classes because the policies only allowed Teachers or Admins.

-- 1. Allow students to view their own block_students records
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.block_students;
CREATE POLICY "Students can view their own enrollments"
  ON public.block_students FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = block_students.student_id
      AND s.auth_user_id = auth.uid()
    )
  );

-- 2. Allow students to view blocks they are enrolled in or general blocks
DROP POLICY IF EXISTS "Authenticated users can view blocks" ON public.blocks;
CREATE POLICY "Authenticated users can view blocks"
  ON public.blocks FOR SELECT TO authenticated
  USING (true);

-- 3. Allow students to view teacher_program_loads
DROP POLICY IF EXISTS "Authenticated users can view program loads" ON public.teacher_program_loads;
CREATE POLICY "Authenticated users can view program loads"
  ON public.teacher_program_loads FOR SELECT TO authenticated
  USING (true);

-- 4. Allow students to view teacher_course_loads
DROP POLICY IF EXISTS "Authenticated users can view course loads" ON public.teacher_course_loads;
CREATE POLICY "Authenticated users can view course loads"
  ON public.teacher_course_loads FOR SELECT TO authenticated
  USING (true);

-- Force postgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
