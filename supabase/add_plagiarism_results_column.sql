--------------------------------------------------------------------------------
-- Add plagiarism_results column to essay_analysis_results table
-- This stores plagiarism check results so teachers don't need to re-check
--------------------------------------------------------------------------------

-- Add plagiarism_results column (JSONB for flexibility)
ALTER TABLE essay_analysis_results 
ADD COLUMN IF NOT EXISTS plagiarism_results jsonb;

-- Create GIN index for JSONB queries on plagiarism_results
CREATE INDEX IF NOT EXISTS essay_analysis_results_plagiarism_results_idx 
ON essay_analysis_results USING GIN (plagiarism_results);

-- Add comment for documentation
COMMENT ON COLUMN essay_analysis_results.plagiarism_results IS 
'Stores plagiarism check results from Copyscape API including matches, percentages, and metadata';

