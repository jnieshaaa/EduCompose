-- 18_ADD_ESSAY_GRADING_COLUMNS.SQL
-- Purpose: Add all missing columns required for the automated grading pipeline

BEGIN;

DO $$ 
BEGIN 
    -- 1. Word Count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='word_count') THEN
        ALTER TABLE essays ADD COLUMN word_count integer DEFAULT 0;
    END IF;

    -- 2. Scores (Numeric)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='grammar_score') THEN
        ALTER TABLE essays ADD COLUMN grammar_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='readability_score') THEN
        ALTER TABLE essays ADD COLUMN readability_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='coherence_score') THEN
        ALTER TABLE essays ADD COLUMN coherence_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='argument_strength_score') THEN
        ALTER TABLE essays ADD COLUMN argument_strength_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='overall_score') THEN
        ALTER TABLE essays ADD COLUMN overall_score numeric;
    END IF;

    -- 3. Detailed Analysis (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='grammar_errors') THEN
        ALTER TABLE essays ADD COLUMN grammar_errors jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='style_issues') THEN
        ALTER TABLE essays ADD COLUMN style_issues jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='argument_analysis') THEN
        ALTER TABLE essays ADD COLUMN argument_analysis jsonb;
    END IF;

    -- 4. Metadata & Errors
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='grading_error') THEN
        ALTER TABLE essays ADD COLUMN grading_error text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='file_path') THEN
        ALTER TABLE essays ADD COLUMN file_path text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='block_id') THEN
        ALTER TABLE essays ADD COLUMN block_id uuid;
    END IF;

    -- 5. Fix essay_analysis_results table (Add missing columns)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='activity_id') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN activity_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='analysis_type') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN analysis_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='word_count') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN word_count integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='generated_at') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN generated_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='processing_time_seconds') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN processing_time_seconds numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='grammar_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN grammar_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='readability_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN readability_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='coherence_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN coherence_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='argument_strength_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN argument_strength_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='knowledge_graph_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN knowledge_graph_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='overall_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN overall_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='plagiarism_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN plagiarism_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='ai_score') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN ai_score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='detailed_analysis') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN detailed_analysis jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='recommendations') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN recommendations jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='diagnostic_summary') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN diagnostic_summary jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='rubric_scores') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN rubric_scores jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='plagiarism_results') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN plagiarism_results jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='ai_detection_results') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN ai_detection_results jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='original_text') THEN
        ALTER TABLE essay_analysis_results ADD COLUMN original_text text;
    END IF;

    -- Update results column to be optional if individual columns are used
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='results') THEN
        ALTER TABLE essay_analysis_results ALTER COLUMN results DROP NOT NULL;
    END IF;

    -- 6. Add UNIQUE constraint to essay_id for ON CONFLICT support
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essay_analysis_results_essay_id_key') THEN
        ALTER TABLE essay_analysis_results ADD CONSTRAINT essay_analysis_results_essay_id_key UNIQUE (essay_id);
    END IF;

    -- 7. Fix notifications table (Add missing related_type column)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_type') THEN
        ALTER TABLE notifications ADD COLUMN related_type text;
    END IF;

END $$;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- 7. RLS POLICIES for essay_analysis_results
ALTER TABLE essay_analysis_results ENABLE ROW LEVEL SECURITY;

-- Allow teachers to view results for their activities
DROP POLICY IF EXISTS "Teachers can view results for their activities" ON essay_analysis_results;
CREATE POLICY "Teachers can view results for their activities" ON essay_analysis_results
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM essay_activities 
        WHERE essay_activities.id = essay_analysis_results.activity_id 
        AND essay_activities.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM essays
        JOIN essay_activities ON essays.activity_id = essay_activities.id
        WHERE essays.id = essay_analysis_results.essay_id
        AND essay_activities.teacher_id = auth.uid()
    )
);

-- Allow teachers to insert/update/delete results for their activities
DROP POLICY IF EXISTS "Teachers can manage results for their activities" ON essay_analysis_results;
CREATE POLICY "Teachers can manage results for their activities" ON essay_analysis_results
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM essay_activities 
        WHERE essay_activities.id = essay_analysis_results.activity_id 
        AND essay_activities.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM essays
        JOIN essay_activities ON essays.activity_id = essay_activities.id
        WHERE essays.id = essay_analysis_results.essay_id
        AND essay_activities.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM essay_activities 
        WHERE essay_activities.id = essay_analysis_results.activity_id 
        AND essay_activities.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM essays
        JOIN essay_activities ON essays.activity_id = essay_activities.id
        WHERE essays.id = essay_analysis_results.essay_id
        AND essay_activities.teacher_id = auth.uid()
    )
);

-- 8. Grant permissions
GRANT ALL ON TABLE essay_analysis_results TO authenticated;
GRANT ALL ON TABLE essay_analysis_results TO service_role;

