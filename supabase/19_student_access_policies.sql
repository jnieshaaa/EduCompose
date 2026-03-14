--------------------------------------------------------------------------------
-- Migration: Add Student Access Policies for My Classes
-- Enables students to view their own enrollments, blocks, and course details
--------------------------------------------------------------------------------

-- 1. Allow students to view their own record in the students table
-- First, drop the overly broad policy from fix_students_rls if it exists
-- DROP POLICY IF EXISTS "Teachers can view all students" ON students;

-- Add a specific policy for students
CREATE POLICY "Students can view their own record"
ON students FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- 2. Allow students to view their own block_students (enrollments)
CREATE POLICY "Students can view their own enrollments"
ON block_students FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM students 
        WHERE auth_user_id = auth.uid()
    )
);

-- 3. Allow students to view blocks they are enrolled in
CREATE POLICY "Students can view their enrolled blocks"
ON blocks FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT block_id FROM block_students
        WHERE student_id IN (
            SELECT id FROM students 
            WHERE auth_user_id = auth.uid()
        )
    )
);

-- 4. Allow students to view teacher_program_loads for their blocks
CREATE POLICY "Students can view their program loads"
ON teacher_program_loads FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT program_load_id FROM blocks
        WHERE id IN (
            SELECT block_id FROM block_students
            WHERE student_id IN (
                SELECT id FROM students 
                WHERE auth_user_id = auth.uid()
            )
        )
    )
);

-- 5. Allow students to view teacher_course_loads for their program loads
CREATE POLICY "Students can view their course loads"
ON teacher_course_loads FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT course_load_id FROM teacher_program_loads
        WHERE id IN (
            SELECT program_load_id FROM blocks
            WHERE id IN (
                SELECT block_id FROM block_students
                WHERE student_id IN (
                    SELECT id FROM students 
                    WHERE auth_user_id = auth.uid()
                )
            )
        )
    )
);

-- 6. Grant SELECT on courses (usually public or shared)
-- If there's no policy yet, add one
CREATE POLICY "Students can view all courses"
ON courses FOR SELECT
TO authenticated
USING (true);

-- 7. Grant SELECT on users (to see professor names)
-- Only for the fields they need
CREATE POLICY "Students can view teacher names"
ON users FOR SELECT
TO authenticated
USING (role = 'teacher' OR role = 'admin');
