--------------------------------------------------------------------------------
-- Essay Analysis Results table
-- Stores complete analysis results for essay submissions
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_analysis_results (
  id                    bigserial PRIMARY KEY,
  essay_id              bigint      NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  student_id            bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id           bigint      REFERENCES essay_activities(id) ON DELETE SET NULL,
  teacher_id            bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  
  -- Analysis metadata
  analysis_type         text        NOT NULL DEFAULT 'comprehensive',
  word_count            integer,
  generated_at         timestamptz NOT NULL DEFAULT now(),
  processing_time_seconds numeric,
  
  -- Scores (stored as individual columns for easy querying)
  grammar_score         numeric,
  readability_score     numeric,
  coherence_score       numeric,
  argument_strength_score numeric,
  knowledge_graph_score numeric,
  overall_score         numeric,
  
  -- Full analysis data (stored as JSONB for flexibility)
  detailed_analysis     jsonb       NOT NULL, -- Complete DetailedAnalysis object
  recommendations       jsonb,                -- Array of DiagnosticRecommendation
  diagnostic_summary    jsonb,                 -- DiagnosticSummary object
  rubric_scores         jsonb,                 -- Rubric scoring results if applicable
  
  -- Original text extracted from OCR
  original_text         text,
  
  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one analysis result per essay (can be updated)
  UNIQUE(essay_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS essay_analysis_results_essay_id_idx ON essay_analysis_results(essay_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_student_id_idx ON essay_analysis_results(student_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_activity_id_idx ON essay_analysis_results(activity_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_teacher_id_idx ON essay_analysis_results(teacher_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_generated_at_idx ON essay_analysis_results(generated_at DESC);
CREATE INDEX IF NOT EXISTS essay_analysis_results_overall_score_idx ON essay_analysis_results(overall_score DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS essay_analysis_results_detailed_analysis_idx ON essay_analysis_results USING GIN (detailed_analysis);
CREATE INDEX IF NOT EXISTS essay_analysis_results_recommendations_idx ON essay_analysis_results USING GIN (recommendations);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_essay_analysis_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER essay_analysis_results_updated_at
  BEFORE UPDATE ON essay_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_analysis_results_updated_at();

-- Enable RLS
ALTER TABLE essay_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view analysis results for essays they have access to
CREATE POLICY "Teachers can view analysis results for their essays"
  ON essay_analysis_results
  FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Teachers can insert analysis results for their essays
CREATE POLICY "Teachers can insert analysis results"
  ON essay_analysis_results
  FOR INSERT
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Teachers can update analysis results for their essays
CREATE POLICY "Teachers can update analysis results"
  ON essay_analysis_results
  FOR UPDATE
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Teachers can delete analysis results for their essays
CREATE POLICY "Teachers can delete analysis results"
  ON essay_analysis_results
  FOR DELETE
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_user_id = auth.uid()
    )
  );

