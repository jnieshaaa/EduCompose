--------------------------------------------------------------------------------
-- Migration: Remove created_by foreign key constraint from sections table
-- Run this in Supabase SQL Editor to fix the foreign key constraint error
--------------------------------------------------------------------------------

-- Drop the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_created_by_fkey' 
        AND table_name = 'sections'
    ) THEN
        ALTER TABLE sections DROP CONSTRAINT sections_created_by_fkey;
    END IF;
END $$;

-- Drop the created_by column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sections' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE sections DROP COLUMN created_by;
    END IF;
END $$;

-- Recreate RLS policies
DROP POLICY IF EXISTS "Teachers can view all sections" ON sections;
DROP POLICY IF EXISTS "Teachers can create sections" ON sections;
DROP POLICY IF EXISTS "Teachers can update sections" ON sections;
DROP POLICY IF EXISTS "Teachers can delete sections" ON sections;

CREATE POLICY "Teachers can view all sections" 
ON sections FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Teachers can update sections" 
ON sections FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Teachers can delete sections" 
ON sections FOR DELETE 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sections TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sections_id_seq TO authenticated;