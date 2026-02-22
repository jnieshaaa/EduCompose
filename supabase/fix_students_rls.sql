--------------------------------------------------------------------------------
-- Migration: Fix RLS policies for students table
-- Run this in Supabase SQL Editor to fix the 403 Forbidden error
--------------------------------------------------------------------------------

-- Drop the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_created_by_fkey' 
        AND table_name = 'students'
    ) THEN
        ALTER TABLE students DROP CONSTRAINT students_created_by_fkey;
    END IF;
END $$;

-- Drop the created_by column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE students DROP COLUMN created_by;
    END IF;
END $$;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Teachers can view all students" ON students;
DROP POLICY IF EXISTS "Teachers can create students" ON students;
DROP POLICY IF EXISTS "Teachers can update students" ON students;
DROP POLICY IF EXISTS "Teachers can delete students" ON students;

-- Recreate policies with proper permissions
CREATE POLICY "Teachers can view all students" 
ON students FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Teachers can create students" 
ON students FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Teachers can update students" 
ON students FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Teachers can delete students" 
ON students FOR DELETE 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE students_id_seq TO authenticated;