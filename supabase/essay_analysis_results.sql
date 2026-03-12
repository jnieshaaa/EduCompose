--------------------------------------------------------------------------------
-- Essay Analysis Results table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_analysis_results (
  id                    bigserial PRIMARY KEY,
  essay_id              bigint      NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  student_id            bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id           bigint      REFERENCES essay_activities(id) ON DELETE SET NULL,
  user_id               bigint      REFERENCES users(id) ON DELETE SET NULL,
  analysis_type         text        NOT NULL DEFAULT 'comprehensive',
  word_count            integer,
  generated_at         timestamptz NOT NULL DEFAULT now(),
  processing_time_seconds numeric,
  grammar_score         numeric,
  readability_score     numeric,
  coherence_score       numeric,
  argument_strength_score numeric,
  knowledge_graph_score numeric,
  overall_score         numeric,
  detailed_analysis     jsonb       NOT NULL,
  recommendations       jsonb,
  diagnostic_summary    jsonb,
  rubric_scores         jsonb,
  original_text         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(essay_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS essay_analysis_results_essay_id_idx ON essay_analysis_results(essay_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_student_id_idx ON essay_analysis_results(student_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_activity_id_idx ON essay_analysis_results(activity_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_user_id_idx ON essay_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS essay_analysis_results_generated_at_idx ON essay_analysis_results(generated_at DESC);
CREATE INDEX IF NOT EXISTS essay_analysis_results_overall_score_idx ON essay_analysis_results(overall_score DESC);
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

-- RLS Policies
CREATE POLICY "Users can view analysis results for their essays"
  ON essay_analysis_results FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analysis results"
  ON essay_analysis_results FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analysis results"
  ON essay_analysis_results FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete analysis results"
  ON essay_analysis_results FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );


