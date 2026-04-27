-- 31_diagnostic_and_fix_500.sql
-- Purpose: Resolve 500 Internal Server Error by cleaning up RLS and ensuring Admin role
-- This version uses a more robust check_is_admin and simplifies policies to avoid recursion.

BEGIN;

-- 1. Redefine check_is_admin to be extremely robust and non-recursive
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  -- We check auth.uid() directly against auth.users metadata
  -- This bypasses any public.users RLS
  RETURN (
    SELECT (
      (raw_app_meta_data->>'role' = 'admin') OR 
      (raw_user_meta_data->>'role' = 'admin')
    )
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 2. Simplify teacher_course_loads policies (No subqueries to public.users)
DROP POLICY IF EXISTS "Admins can manage all course loads" ON public.teacher_course_loads;
DROP POLICY IF EXISTS "Teachers can manage own course loads" ON public.teacher_course_loads;
DROP POLICY IF EXISTS "Students can view their course loads" ON public.teacher_course_loads;

-- Admin Policy
CREATE POLICY "Admins can manage all course loads" ON public.teacher_course_loads
FOR ALL TO authenticated
USING (public.check_is_admin());

-- Teacher Policy
CREATE POLICY "Teachers can manage own course loads" ON public.teacher_course_loads
FOR ALL TO authenticated
USING (teacher_id = auth.uid());

-- Student Policy (Allowing students to see the loads they are enrolled in)
CREATE POLICY "Students can view their course loads" ON public.teacher_course_loads
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_program_loads tpl
    JOIN public.blocks b ON b.program_load_id = tpl.id
    JOIN public.block_students bs ON bs.block_id = b.id
    WHERE tpl.course_load_id = public.teacher_course_loads.id
    AND bs.student_id = auth.uid()
  )
);

-- 3. Simplify teacher_program_loads policies
DROP POLICY IF EXISTS "Admins can manage all program loads" ON public.teacher_program_loads;
DROP POLICY IF EXISTS "Teachers can manage own program loads" ON public.teacher_program_loads;

-- Admin Policy
CREATE POLICY "Admins can manage all program loads" ON public.teacher_program_loads
FOR ALL TO authenticated
USING (public.check_is_admin());

-- Teacher Policy (Smart ownership check)
CREATE POLICY "Teachers can manage own program loads" ON public.teacher_program_loads
FOR ALL TO authenticated
USING (
  (teacher_id = auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.teacher_course_loads tcl
    WHERE tcl.id = public.teacher_program_loads.course_load_id
    AND tcl.teacher_id = auth.uid()
  )
);

-- 4. Re-grant permissions just in case
GRANT ALL ON TABLE public.teacher_course_loads TO authenticated;
GRANT ALL ON TABLE public.teacher_program_loads TO authenticated;

COMMIT;

-- Force reload
NOTIFY pgrst, 'reload schema';
