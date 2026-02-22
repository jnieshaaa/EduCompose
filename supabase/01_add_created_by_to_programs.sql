--------------------------------------------------------------------------------
-- Migration: Add created_by column to programs table
-- Run this in Supabase SQL Editor if you already have a programs table
--------------------------------------------------------------------------------

-- First, drop any existing foreign key constraint that might be wrong
DO $$ 
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'programs_created_by_fkey' 
        AND table_name = 'programs'
    ) THEN
        ALTER TABLE programs DROP CONSTRAINT programs_created_by_fkey;
    END IF;
END $$;

-- Add created_by column if it doesn't exist (nullable, no constraint)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE programs ADD COLUMN created_by bigint;
        CREATE INDEX IF NOT EXISTS programs_created_by_idx ON programs(created_by);
    END IF;
END $$;

-- Recreate RLS policies with DROP IF EXISTS
DROP POLICY IF EXISTS "Teachers can view all programs" ON programs;
CREATE POLICY "Teachers can view all programs" 
ON programs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers can create programs" ON programs;
CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can update programs" ON programs;
CREATE POLICY "Teachers can update programs" 
ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can delete programs" ON programs;
CREATE POLICY "Teachers can delete programs" 
ON programs FOR DELETE TO authenticated USING (true);
