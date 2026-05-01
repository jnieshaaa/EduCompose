-- FIX RLS FOR ESSAY ANALYSIS RESULTS
-- Purpose: Allow students to view their own analysis results

BEGIN;

-- Allow students to view their own results
DROP POLICY IF EXISTS "Students can view their own results" ON essay_analysis_results;
CREATE POLICY "Students can view their own results" ON essay_analysis_results
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Ensure teachers can still view results for their students' essays
-- (This is already covered by the previous policies but we make sure they stay)

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
