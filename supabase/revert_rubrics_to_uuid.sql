-- revert_rubrics_to_uuid.sql
-- Run this in Supabase SQL Editor to revert rubrics to UUID-based teacher identification.
-- This version handles dependent RLS policies.

BEGIN;

-- 1. Drop dependent policies first
-- These names match your current error message
DROP POLICY IF EXISTS "Users can create rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can update their own rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can delete their own rubrics" ON rubrics;

-- Also drop other possible names from previous versions
DROP POLICY IF EXISTS "Teachers can manage their own rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can view all rubrics" ON rubrics;

-- 2. Drop the incorrect INT column
-- (Even if it has data, you confirmed only 1 rubric exists, so dropping is safe)
ALTER TABLE rubrics DROP COLUMN IF EXISTS teacher_id;

-- 3. Add the correct UUID column
-- We link it to users(auth_user_id) to match the standard UUID architecture
ALTER TABLE rubrics ADD COLUMN teacher_id uuid REFERENCES users(auth_user_id) ON DELETE SET NULL;

-- 4. Restore the Index
DROP INDEX IF EXISTS rubrics_teacher_id_idx;
CREATE INDEX IF NOT EXISTS rubrics_teacher_id_idx ON rubrics(teacher_id);

-- 5. Re-create the policies using UUID logic
-- Viewing all rubrics is allowed for authenticated users
CREATE POLICY "Users can view all rubrics" 
    ON rubrics FOR SELECT TO authenticated 
    USING (true);

-- Only teachers can manage their own rubrics
CREATE POLICY "Users can create rubrics" 
    ON rubrics FOR INSERT TO authenticated 
    WITH CHECK (teacher_id = auth.uid() OR teacher_id IS NULL);

CREATE POLICY "Users can update their own rubrics" 
    ON rubrics FOR UPDATE TO authenticated 
    USING (teacher_id = auth.uid());

CREATE POLICY "Users can delete their own rubrics" 
    ON rubrics FOR DELETE TO authenticated 
    USING (teacher_id = auth.uid());

COMMIT;
