--------------------------------------------------------------------------------
-- Migration: Add explicit RLS policies for teacher_program_loads
--------------------------------------------------------------------------------

-- 1. Ensure RLS is enabled
ALTER TABLE teacher_program_loads ENABLE ROW LEVEL SECURITY;

-- 2. Drop the existing "FOR ALL" policy to avoid conflicts or confusion
DROP POLICY IF EXISTS "Teachers can manage their own program loads" ON teacher_program_loads;

-- 3. Create explicit INSERT policy
CREATE POLICY "Teacher can insert program loads for their course"
ON teacher_program_loads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);

-- 4. Create explicit SELECT policy
CREATE POLICY "Teacher can view their program loads"
ON teacher_program_loads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);

-- 5. Create explicit UPDATE policy
CREATE POLICY "Teacher can update their program loads"
ON teacher_program_loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);

-- 6. Create explicit DELETE policy
CREATE POLICY "Teacher can delete their program loads"
ON teacher_program_loads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);
