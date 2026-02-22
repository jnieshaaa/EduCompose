--------------------------------------------------------------------------------
-- Migration: Fix RLS policies for sections table
-- Run this in Supabase SQL Editor to fix the 403 Forbidden error
--------------------------------------------------------------------------------

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Teachers can view all sections" ON sections;
DROP POLICY IF EXISTS "Teachers can create sections" ON sections;
DROP POLICY IF EXISTS "Teachers can update sections" ON sections;
DROP POLICY IF EXISTS "Teachers can delete sections" ON sections;

-- Recreate policies with proper permissions
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