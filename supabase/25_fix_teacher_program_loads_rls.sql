--------------------------------------------------------------------------------
-- Migration: Fix Teacher Program Loads RLS
-- Allows teachers to manage program loads based on course load ownership
--------------------------------------------------------------------------------

-- 1. Ensure RLS is enabled
ALTER TABLE teacher_program_loads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if they exist (from migration 20)
DROP POLICY IF EXISTS "Teachers can manage their own program loads" ON teacher_program_loads;
DROP POLICY IF EXISTS "Teacher can insert program loads for their course" ON teacher_program_loads;
DROP POLICY IF EXISTS "Teacher can view their program loads" ON teacher_program_loads;

-- 3. Create INSERT policy
CREATE POLICY "Teacher can insert program loads for their course"
ON teacher_program_loads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);

-- 4. Create SELECT policy
CREATE POLICY "Teacher can view their program loads"
ON teacher_program_loads
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);

-- 5. Create DELETE policy (Optional but usually needed)
DROP POLICY IF EXISTS "Teacher can delete their program loads" ON teacher_program_loads;
CREATE POLICY "Teacher can delete their program loads"
ON teacher_program_loads
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM teacher_course_loads
    WHERE teacher_course_loads.id = teacher_program_loads.course_load_id
    AND teacher_course_loads.teacher_id = auth.uid()
  )
);
