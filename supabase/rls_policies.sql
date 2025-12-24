--------------------------------------------------------------------------------
-- RLS Policies for Teacher Access
-- This file contains Row Level Security policies that allow authenticated
-- teachers to manage data in the application.
--------------------------------------------------------------------------------

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Teachers can view all programs" ON programs;
DROP POLICY IF EXISTS "Teachers can manage all programs" ON programs;
DROP POLICY IF EXISTS "Teachers can manage sections" ON sections;
DROP POLICY IF EXISTS "Teachers can manage students" ON students;
DROP POLICY IF EXISTS "Teachers can manage rubrics" ON rubrics;

--------------------------------------------------------------------------------
-- PROGRAMS TABLE POLICIES
--------------------------------------------------------------------------------

-- Allow authenticated teachers to view all programs
CREATE POLICY "Teachers can view all programs" 
ON programs FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated teachers to create programs
CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated teachers to update programs
CREATE POLICY "Teachers can update programs" 
ON programs FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated teachers to delete programs
CREATE POLICY "Teachers can delete programs" 
ON programs FOR DELETE 
TO authenticated 
USING (true);

--------------------------------------------------------------------------------
-- SECTIONS TABLE POLICIES
--------------------------------------------------------------------------------

-- Allow authenticated teachers to view all sections
CREATE POLICY "Teachers can view all sections" 
ON sections FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated teachers to create sections
CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated teachers to update sections
CREATE POLICY "Teachers can update sections" 
ON sections FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated teachers to delete sections
CREATE POLICY "Teachers can delete sections" 
ON sections FOR DELETE 
TO authenticated 
USING (true);

--------------------------------------------------------------------------------
-- STUDENTS TABLE POLICIES
--------------------------------------------------------------------------------

-- Allow authenticated teachers to view all students
CREATE POLICY "Teachers can view all students" 
ON students FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated teachers to create students
CREATE POLICY "Teachers can create students" 
ON students FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated teachers to update students
CREATE POLICY "Teachers can update students" 
ON students FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated teachers to delete students
CREATE POLICY "Teachers can delete students" 
ON students FOR DELETE 
TO authenticated 
USING (true);

--------------------------------------------------------------------------------
-- RUBRICS TABLE POLICIES
--------------------------------------------------------------------------------

-- Allow authenticated teachers to view all rubrics
CREATE POLICY "Teachers can view all rubrics" 
ON rubrics FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated teachers to create rubrics
CREATE POLICY "Teachers can create rubrics" 
ON rubrics FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

-- Allow authenticated teachers to update their own rubrics
CREATE POLICY "Teachers can update their own rubrics" 
ON rubrics FOR UPDATE 
TO authenticated 
USING (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
) 
WITH CHECK (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

-- Allow authenticated teachers to delete their own rubrics
CREATE POLICY "Teachers can delete their own rubrics" 
ON rubrics FOR DELETE 
TO authenticated 
USING (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

--------------------------------------------------------------------------------
-- ESSAY_ACTIVITIES TABLE POLICIES
-- (Already has a policy, but let's ensure it covers all operations)
--------------------------------------------------------------------------------

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Teachers can manage their own activities" ON essay_activities;

-- Allow authenticated teachers to view their own activities
CREATE POLICY "Teachers can view their own activities" 
ON essay_activities FOR SELECT 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to create activities
CREATE POLICY "Teachers can create activities" 
ON essay_activities FOR INSERT 
TO authenticated 
WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to update their own activities
CREATE POLICY "Teachers can update their own activities" 
ON essay_activities FOR UPDATE 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to delete their own activities
CREATE POLICY "Teachers can delete their own activities" 
ON essay_activities FOR DELETE 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

--------------------------------------------------------------------------------
-- ESSAYS TABLE POLICIES
-- (Already has a policy, but let's ensure it covers all operations)
--------------------------------------------------------------------------------

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Teachers can manage their own essays" ON essays;

-- Allow authenticated teachers to view essays they manage
CREATE POLICY "Teachers can view their own essays" 
ON essays FOR SELECT 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to update essays they manage
CREATE POLICY "Teachers can update their own essays" 
ON essays FOR UPDATE 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to delete essays they manage
DROP POLICY IF EXISTS "Teachers can delete their own essays" ON essays;
CREATE POLICY "Teachers can delete their own essays" 
ON essays FOR DELETE 
TO authenticated 
USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow authenticated teachers to create essays (for manual uploads)
DROP POLICY IF EXISTS "Teachers can create essays" ON essays;
CREATE POLICY "Teachers can create essays" 
ON essays FOR INSERT 
TO authenticated 
WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Note: Students should be able to insert their own essays, but that would
-- require a separate policy for the 'student' role, which is not implemented yet.

