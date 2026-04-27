-- 19_ADD_STUDENT_RLS_FOR_RESULTS.SQL
-- Purpose: Allow students to view their own analysis results

BEGIN;

-- Allow students to view their own results in essay_analysis_results
DROP POLICY IF EXISTS "Students can view own results" ON essay_analysis_results;
CREATE POLICY "Students can view own results" ON essay_analysis_results
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM essays
        WHERE essays.id = essay_analysis_results.essay_id
        AND essays.student_id = auth.uid()
    )
);

-- Ensure overall_score in essays table is also visible to students (it should be, but let's be sure)
-- The policy already exists as "Students can view/manage own essays" from 03_security_and_data_v1.sql

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
