--------------------------------------------------------------------------------
-- Add created_by field to students table
-- This allows teachers to only see their own students
--------------------------------------------------------------------------------

-- Add created_by column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS created_by bigint REFERENCES teachers(id) ON DELETE SET NULL;

-- IMPORTANT: Existing students will have created_by = NULL
-- These will NOT be visible to any teacher after this migration
-- If you want to assign existing records to a specific teacher, uncomment and modify the following:
-- UPDATE students SET created_by = (SELECT id FROM teachers WHERE email = 'junie.antopina@example.com' LIMIT 1) WHERE created_by IS NULL;

--------------------------------------------------------------------------------
-- Update RLS Policies for Students
--------------------------------------------------------------------------------

-- Drop ALL existing policies (including any that were partially created)
-- This ensures we start fresh regardless of what policies exist
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
-- The policy checks that created_by matches the current user's teacher ID
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
