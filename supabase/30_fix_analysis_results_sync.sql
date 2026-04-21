-- 30_fix_analysis_results_sync.sql
-- 1. Allows students to UPDATE their own analysis results (for plagiarism/AI detection saving)
-- 2. Ensures the plagiarism/AI columns are available (idempotent)

BEGIN;

-- 1. Ensure columns exist (usually they do from 06_essays.sql)
ALTER TABLE public.essay_analysis_results 
  ADD COLUMN IF NOT EXISTS plagiarism_results jsonb,
  ADD COLUMN IF NOT EXISTS ai_detection_results jsonb;

-- 2. Update RLS policies for essay_analysis_results
-- We need to allow UPDATE for students on their own records
DROP POLICY IF EXISTS "Students can update their own analysis results" ON essay_analysis_results;
CREATE POLICY "Students can update their own analysis results"
  ON essay_analysis_results FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
  );

-- Also ensure they can SELECT (already in 27_fix_analysis_results_rls but let's be sure)
DROP POLICY IF EXISTS "Students can view their own analysis results" ON essay_analysis_results;
CREATE POLICY "Students can view their own analysis results"
  ON essay_analysis_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
  );

-- 3. Update RLS for essays table to allow students to update their own analysis JSONB
DROP POLICY IF EXISTS "Students can update their own essays" ON essays;
CREATE POLICY "Students can update their own essays"
  ON essays FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      WHERE s.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      WHERE s.auth_user_id = auth.uid()
    )
  );

COMMIT;
