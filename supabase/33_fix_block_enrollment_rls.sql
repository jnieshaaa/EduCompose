BEGIN;

-- 1. Helper for teacher role check (non-recursive)
CREATE OR REPLACE FUNCTION public.check_is_teacher()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (
      (raw_app_meta_data->>'role' = 'teacher') OR 
      (raw_user_meta_data->>'role' = 'teacher')
    )
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 2. Policies for 'block_students'
DROP POLICY IF EXISTS "Teachers can manage students in own blocks" ON block_students;
CREATE POLICY "Teachers can manage students in own blocks" ON block_students
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM blocks
        WHERE blocks.id = block_students.block_id
        AND blocks.teacher_id = auth.uid()
    )
    OR public.check_is_admin()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM blocks
        WHERE blocks.id = block_students.block_id
        AND blocks.teacher_id = auth.uid()
    )
    OR public.check_is_admin()
);

-- 3. Update 'users' SELECT policy to allow teachers to find students for enrollment
-- This ensures the auto-enroll logic in CourseSectionsView.tsx can find students by program/year/block
DROP POLICY IF EXISTS "Teachers can view all students for enrollment" ON public.users;
CREATE POLICY "Teachers can view all students for enrollment" ON public.users 
FOR SELECT TO authenticated
USING (
    (role = 'student') AND (public.check_is_teacher() OR public.check_is_admin())
);

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
