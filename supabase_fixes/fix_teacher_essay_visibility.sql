-- Migration: Broaden Essay and Analysis Visibility for Teachers and Admins
-- This ensures teachers can see all submissions for activities they created.

-- 1. FIX ESSAYS TABLE POLICIES
DROP POLICY IF EXISTS "Teachers can view their own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view essays for their activities" ON essays;

CREATE POLICY "Teachers can view essays for their activities"
ON essays FOR SELECT
TO authenticated
USING (
    -- Teacher is the owner of the activity linked to the essay
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essays.activity_id
        AND ea.teacher_id = auth.uid()
    )
    OR
    -- Teacher is explicitly assigned as teacher_id on the essay (legacy/fallback)
    (teacher_id = auth.uid())
);

-- Allow teachers to manage essays for their activities (delete/update scores)
DROP POLICY IF EXISTS "Teachers can manage essays for their activities" ON essays;
CREATE POLICY "Teachers can manage essays for their activities"
ON essays FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essays.activity_id
        AND ea.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essays.activity_id
        AND ea.teacher_id = auth.uid()
    )
);

-- 2. FIX ESSAY_ANALYSIS_RESULTS TABLE POLICIES
DROP POLICY IF EXISTS "Teachers can view analyses for their activities" ON essay_analysis_results;
CREATE POLICY "Teachers can view analyses for their activities"
ON essay_analysis_results FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essay_analysis_results.activity_id
        AND ea.teacher_id = auth.uid()
    )
);

-- Allow teachers to insert/manage analysis results for their activities
DROP POLICY IF EXISTS "Teachers can manage analyses for their activities" ON essay_analysis_results;
CREATE POLICY "Teachers can manage analyses for their activities"
ON essay_analysis_results FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essay_analysis_results.activity_id
        AND ea.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM essay_activities ea
        WHERE ea.id = essay_analysis_results.activity_id
        AND ea.teacher_id = auth.uid()
    )
);

-- 3. ENSURE ADMINS CAN SEE EVERYTHING
DROP POLICY IF EXISTS "Admins can manage all essays" ON essays;
CREATE POLICY "Admins can manage all essays"
ON essays FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can manage all analysis results" ON essay_analysis_results;
CREATE POLICY "Admins can manage all analysis results"
ON essay_analysis_results FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    )
);

-- 4. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
