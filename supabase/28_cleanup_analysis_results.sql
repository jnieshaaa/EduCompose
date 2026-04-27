-- Schema Cleanup for Essay Analysis Results
-- Purpose: Remove redundant columns and fix constraints for Plagiarism/AI checks

BEGIN;

-- 1. Remove the redundant plagiarism_score (User wants to keep results JSON only)
ALTER TABLE public.essay_analysis_results DROP COLUMN IF EXISTS plagiarism_score;

-- 2. Ensure ai_score is numeric (it already is, but just in case)
-- 3. Ensure plagiarism_results and ai_detection_results are JSONB
-- (These are already set, so we focus on the constraints)

-- 4. Fix the analysis_type constraint and other required columns
-- Make them nullable to avoid not-null constraint errors
ALTER TABLE public.essay_analysis_results ALTER COLUMN analysis_type DROP NOT NULL;
ALTER TABLE public.essay_analysis_results ALTER COLUMN detailed_analysis DROP NOT NULL;

-- 5. Add an updated_at trigger if not already present
-- (Assuming update_updated_at_column exists from previous migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_essay_analysis_results_updated_at') THEN
        CREATE TRIGGER tr_essay_analysis_results_updated_at
        BEFORE UPDATE ON public.essay_analysis_results
        FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
    END IF;
END $$;

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
