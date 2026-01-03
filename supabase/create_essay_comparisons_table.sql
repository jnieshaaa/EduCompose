--------------------------------------------------------------------------------
-- Essay Comparisons table
-- Stores LLM analysis of essay comparisons for teachers to review
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_comparisons (
  id                    bigserial PRIMARY KEY,
  activity_id           bigint      NOT NULL REFERENCES essay_activities(id) ON DELETE CASCADE,
  teacher_id            bigint      NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  
  -- Student IDs being compared (array of student IDs)
  student_ids           bigint[]    NOT NULL,
  essay_ids             bigint[]    NOT NULL,
  
  -- LLM Analysis results
  insights              text        NOT NULL, -- Professional explanation of similarities
  similarity_highlights jsonb       NOT NULL, -- Array of highlight objects with positions and text
  similarity_score      numeric,              -- Overall similarity score (0-1)
  
  -- Metadata
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure we can query by activity and teacher efficiently
  CONSTRAINT essay_comparisons_student_ids_check CHECK (array_length(student_ids, 1) >= 2)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS essay_comparisons_activity_id_idx ON essay_comparisons(activity_id);
CREATE INDEX IF NOT EXISTS essay_comparisons_teacher_id_idx ON essay_comparisons(teacher_id);
CREATE INDEX IF NOT EXISTS essay_comparisons_created_at_idx ON essay_comparisons(created_at DESC);

-- RLS Policies
ALTER TABLE essay_comparisons ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own comparisons
CREATE POLICY "Teachers can view their own comparisons"
  ON essay_comparisons
  FOR SELECT
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  );

-- Teachers can insert their own comparisons
CREATE POLICY "Teachers can insert their own comparisons"
  ON essay_comparisons
  FOR INSERT
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  );

-- Teachers can update their own comparisons
CREATE POLICY "Teachers can update their own comparisons"
  ON essay_comparisons
  FOR UPDATE
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  );

-- Teachers can delete their own comparisons
CREATE POLICY "Teachers can delete their own comparisons"
  ON essay_comparisons
  FOR DELETE
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  );

