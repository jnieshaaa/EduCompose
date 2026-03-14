--------------------------------------------------------------------------------
-- Migration: Fix RLS Infinite Recursion
-- This script adds teacher_id to TPL and Blocks to break recursion loops
-- and simplifies policies to use direct field comparisons where possible.
--------------------------------------------------------------------------------

-- 1. ADD TEACHER_ID COLUMNS TO BREAK RECURSION
-- By having teacher_id directly on the tables, we don't need to join back to teacher_course_loads
ALTER TABLE teacher_program_loads ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES users(auth_user_id) ON DELETE CASCADE;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES users(auth_user_id) ON DELETE CASCADE;

-- 2. BACKFILL TEACHER_ID DATA
-- From TCL -> TPL
UPDATE teacher_program_loads tpl
SET teacher_id = tcl.teacher_id
FROM teacher_course_loads tcl
WHERE tpl.course_load_id = tcl.id;

-- From TPL -> Blocks
UPDATE blocks b
SET teacher_id = tpl.teacher_id
FROM teacher_program_loads tpl
WHERE b.program_load_id = tpl.id;

-- 3. REWRITE TEACHER POLICIES (Non-Recursive)
DROP POLICY IF EXISTS "Teachers can manage their own program loads" ON teacher_program_loads;
CREATE POLICY "Teachers can manage their own program loads"
    ON teacher_program_loads
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage their own blocks" ON blocks;
CREATE POLICY "Teachers can manage their own blocks"
    ON blocks
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Fix block_students teacher policy as well (Efficiency gain)
DROP POLICY IF EXISTS "Teachers can manage their block_students" ON block_students;
CREATE POLICY "Teachers can manage their block_students"
    ON block_students
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM blocks b
            WHERE b.id = block_students.block_id
            AND b.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM blocks b
            WHERE b.id = block_students.block_id
            AND b.teacher_id = auth.uid()
        )
    );

-- 4. REWRITE STUDENT POLICIES (Non-Recursive)
-- Use the chain: TCL -> TPL -> Blocks -> Block_Students -> Students (Downstream only)

-- Drop the recursive policies from previous migration if they exist
DROP POLICY IF EXISTS "Students can view their course loads" ON teacher_course_loads;
DROP POLICY IF EXISTS "Students can view their program loads" ON teacher_program_loads;
DROP POLICY IF EXISTS "Students can view their enrolled blocks" ON blocks;

-- New Non-Recursive Student Policies:

-- Students can view TCL if they are in a block that uses it
CREATE POLICY "Students can view their course loads"
ON teacher_course_loads FOR SELECT
TO authenticated
USING (
    EXISTS (
        -- Directly check if any of the student's blocks link to this TCL
        -- Join path: TCL <- TPL <- Blocks <- Block_Students <- Student
        SELECT 1 FROM block_students bs
        JOIN blocks b ON b.id = bs.block_id
        JOIN teacher_program_loads tpl ON tpl.id = b.program_load_id
        JOIN students s ON s.id = bs.student_id
        WHERE tpl.course_load_id = teacher_course_loads.id
        AND s.auth_user_id = auth.uid()
    )
);

-- Students can view TPL if they are in a block that uses it
CREATE POLICY "Students can view their program loads"
ON teacher_program_loads FOR SELECT
TO authenticated
USING (
    EXISTS (
        -- Join path: TPL <- Blocks <- Block_Students <- Student
        SELECT 1 FROM block_students bs
        JOIN blocks b ON b.id = bs.block_id
        JOIN students s ON s.id = bs.student_id
        WHERE b.program_load_id = teacher_program_loads.id
        AND s.auth_user_id = auth.uid()
    )
);

-- Students can view Blocks they are in
CREATE POLICY "Students can view their enrolled blocks"
ON blocks FOR SELECT
TO authenticated
USING (
    EXISTS (
        -- Join path: Blocks <- Block_Students <- Student
        SELECT 1 FROM block_students bs
        JOIN students s ON s.id = bs.student_id
        WHERE bs.block_id = blocks.id
        AND s.auth_user_id = auth.uid()
    )
);
