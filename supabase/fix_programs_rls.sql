--------------------------------------------------------------------------------
-- Quick Fix: Add missing RLS policies for programs table
-- Run this in your Supabase SQL Editor to fix the 403 error when creating programs
--------------------------------------------------------------------------------

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

