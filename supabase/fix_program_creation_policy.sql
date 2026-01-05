--------------------------------------------------------------------------------
-- Fix: Update INSERT policy to allow NULL created_by during insert
-- The policy should check that if created_by is provided, it matches the teacher
-- But also allow the database to set it via a trigger or default
--------------------------------------------------------------------------------

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Teachers can create programs" ON programs;

-- Create a more flexible INSERT policy
-- This allows teachers to insert programs where created_by matches their teacher ID
-- OR where created_by is NULL (which will be handled by the frontend setting it)
CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IS NULL 
  OR created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Do the same for sections
DROP POLICY IF EXISTS "Teachers can create sections" ON sections;

CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IS NULL 
  OR created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);
