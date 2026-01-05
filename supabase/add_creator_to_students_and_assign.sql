--------------------------------------------------------------------------------
-- Combined script: Add created_by to students AND assign existing students
-- This script does both operations in one go
--
-- IMPORTANT: Modify the email address below to match the teacher who should own
-- the existing students
--------------------------------------------------------------------------------

-- Step 1: Add created_by column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS created_by bigint REFERENCES teachers(id) ON DELETE SET NULL;

--------------------------------------------------------------------------------
-- Step 2: Update RLS Policies for Students
--------------------------------------------------------------------------------

-- Drop ALL existing policies (including any that were partially created)
DROP POLICY IF EXISTS "Teachers can view all students" ON students;
DROP POLICY IF EXISTS "Teachers can manage students" ON students;
DROP POLICY IF EXISTS "Teachers can view their own students" ON students;
DROP POLICY IF EXISTS "Teachers can create students" ON students;
DROP POLICY IF EXISTS "Teachers can update students" ON students;
DROP POLICY IF EXISTS "Teachers can update their own students" ON students;
DROP POLICY IF EXISTS "Teachers can delete students" ON students;
DROP POLICY IF EXISTS "Teachers can delete their own students" ON students;

-- Only allow teachers to view their own students
-- Students with created_by = NULL will NOT be visible to anyone
CREATE POLICY "Teachers can view their own students" 
ON students FOR SELECT 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow teachers to create students (with created_by set to their teacher_id)
CREATE POLICY "Teachers can create students" 
ON students FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Only allow teachers to update their own students
CREATE POLICY "Teachers can update their own students" 
ON students FOR UPDATE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Only allow teachers to delete their own students
CREATE POLICY "Teachers can delete their own students" 
ON students FOR DELETE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

--------------------------------------------------------------------------------
-- Step 3: Assign existing students to a teacher (OPTIONAL)
-- Uncomment and modify the email below if you want to assign existing students
--------------------------------------------------------------------------------

-- UPDATE students 
-- SET created_by = (
--   SELECT id FROM teachers 
--   WHERE email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
--   LIMIT 1
-- ) 
-- WHERE created_by IS NULL;

-- Verify the assignment (run this separately after the UPDATE above)
-- SELECT 
--   s.id,
--   s.student_code,
--   s.full_name,
--   s.created_by,
--   t.email as creator_email,
--   t.full_name as creator_name
-- FROM students s
-- LEFT JOIN teachers t ON s.created_by = t.id
-- ORDER BY s.id;
