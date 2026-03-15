--------------------------------------------------------------------------------
-- Migration: Add Student Access to Essay Activities and Essays
--------------------------------------------------------------------------------

-- 1. Allow students to view essay activities assigned to them
DROP POLICY IF EXISTS "Students can view assigned activities" ON essay_activities;

CREATE POLICY "Students can view assigned activities"
ON essay_activities FOR SELECT
TO authenticated
USING (
    -- Allow current teacher (already exists but we refine it)
    (teacher_id = auth.uid())
    OR
    -- Allow students assigned via block
    EXISTS (
        SELECT 1 FROM students s
        JOIN block_students bs ON bs.student_id = s.id
        WHERE s.auth_user_id = auth.uid()
        AND essay_activities.block_id @> ARRAY[bs.block_id]
    )
    OR
    -- Allow students assigned via course
    EXISTS (
        SELECT 1 FROM students s
        JOIN block_students bs ON bs.student_id = s.id
        JOIN blocks b ON b.id = bs.block_id
        JOIN teacher_program_loads tpl ON tpl.id = b.program_load_id
        JOIN teacher_course_loads tcl ON tcl.id = tpl.course_load_id
        WHERE s.auth_user_id = auth.uid()
        AND essay_activities.course_id @> ARRAY[tcl.course_id]
    )
);

-- 2. Allow students to view and create their own essays
DROP POLICY IF EXISTS "Students can view their own essays" ON essays;
CREATE POLICY "Students can view their own essays"
ON essays FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can create their own essays" ON essays;
CREATE POLICY "Students can create their own essays"
ON essays FOR INSERT
TO authenticated
WITH CHECK (
    student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can update their own essays" ON essays;
CREATE POLICY "Students can update their own essays"
ON essays FOR UPDATE
TO authenticated
USING (
    student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
);
