--------------------------------------------------------------------------------
-- Add created_by field to programs and sections tables
-- This allows teachers to only see their own programs and sections
--------------------------------------------------------------------------------

-- Add created_by column to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS created_by bigint REFERENCES teachers(id) ON DELETE SET NULL;

-- Add created_by column to sections table
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS created_by bigint REFERENCES teachers(id) ON DELETE SET NULL;

-- IMPORTANT: Existing programs and sections will have created_by = NULL
-- These will NOT be visible to any teacher after this migration
-- If you want to assign existing records to a specific teacher, uncomment and modify the following:
-- UPDATE programs SET created_by = (SELECT id FROM teachers WHERE email = 'junie.antopina@example.com' LIMIT 1) WHERE created_by IS NULL;
-- UPDATE sections SET created_by = (SELECT id FROM teachers WHERE email = 'junie.antopina@example.com' LIMIT 1) WHERE created_by IS NULL;

--------------------------------------------------------------------------------
-- Update RLS Policies for Programs
--------------------------------------------------------------------------------

-- Drop ALL existing policies (including any that were partially created)
-- This ensures we start fresh regardless of what policies exist
DROP POLICY IF EXISTS "Teachers can view all programs" ON programs;
DROP POLICY IF EXISTS "Teachers can manage all programs" ON programs;
DROP POLICY IF EXISTS "Teachers can view their own programs" ON programs;
DROP POLICY IF EXISTS "Teachers can create programs" ON programs;
DROP POLICY IF EXISTS "Teachers can update programs" ON programs;
DROP POLICY IF EXISTS "Teachers can update their own programs" ON programs;
DROP POLICY IF EXISTS "Teachers can delete programs" ON programs;

-- Only allow teachers to view their own programs
-- Programs with created_by = NULL will NOT be visible to anyone
CREATE POLICY "Teachers can view their own programs" 
ON programs FOR SELECT 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow teachers to create programs (with created_by set to their teacher_id)
-- The policy checks that created_by matches the current user's teacher ID
CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Only allow teachers to update their own programs
CREATE POLICY "Teachers can update their own programs" 
ON programs FOR UPDATE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow teachers to delete their own programs
CREATE POLICY "Teachers can delete their own programs" 
ON programs FOR DELETE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

--------------------------------------------------------------------------------
-- Update RLS Policies for Sections
--------------------------------------------------------------------------------

-- Drop ALL existing policies (including any that were partially created)
-- This ensures we start fresh regardless of what policies exist
DROP POLICY IF EXISTS "Teachers can view all sections" ON sections;
DROP POLICY IF EXISTS "Teachers can manage sections" ON sections;
DROP POLICY IF EXISTS "Teachers can view their own sections" ON sections;
DROP POLICY IF EXISTS "Teachers can create sections" ON sections;
DROP POLICY IF EXISTS "Teachers can update sections" ON sections;
DROP POLICY IF EXISTS "Teachers can update their own sections" ON sections;
DROP POLICY IF EXISTS "Teachers can delete sections" ON sections;
DROP POLICY IF EXISTS "Teachers can delete their own sections" ON sections;

-- Only allow teachers to view their own sections
-- Sections with created_by = NULL will NOT be visible to anyone
CREATE POLICY "Teachers can view their own sections" 
ON sections FOR SELECT 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Allow teachers to create sections (with created_by set to their teacher_id)
-- The policy checks that created_by matches the current user's teacher ID
CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Only allow teachers to update their own sections
CREATE POLICY "Teachers can update their own sections" 
ON sections FOR UPDATE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Only allow teachers to delete their own sections
CREATE POLICY "Teachers can delete their own sections" 
ON sections FOR DELETE 
TO authenticated 
USING (
  created_by IS NOT NULL 
  AND created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);
