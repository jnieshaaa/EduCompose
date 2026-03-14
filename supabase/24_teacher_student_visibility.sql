--------------------------------------------------------------------------------
-- Migration: Broaden Student Visibility for Teachers
-- Allows teachers to see students belonging to programs they teach,
-- enabling automatic student linking when creating blocks.
--------------------------------------------------------------------------------

-- 1. ADDIITONAL SELECT POLICY FOR STUDENTS
-- This allows teachers to find students in their programs who aren't explicitly assigned to them yet
DROP POLICY IF EXISTS "Teachers can view students in their programs" ON students;
CREATE POLICY "Teachers can view students in their programs"
ON students FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM teacher_program_loads tpl
        JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
        WHERE tcl.teacher_id = auth.uid()
        AND tpl.program_id = students.program_id
    )
);

-- 2. ENSURE ADMINS CAN DO EVERYTHING
-- (Checking if is_admin() exists from 03_add_admin_policies.sql)
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
CREATE POLICY "Admins can manage all students"
ON students FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
