--------------------------------------------------------------------------------
-- Essay Comparisons table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_comparisons (
  id                    bigserial PRIMARY KEY,
  activity_id           bigint      NOT NULL REFERENCES essay_activities(id) ON DELETE CASCADE,
  user_id               bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_ids           bigint[]    NOT NULL,
  essay_ids             bigint[]    NOT NULL,
  insights              text        NOT NULL,
  similarity_highlights jsonb       NOT NULL,
  similarity_score      numeric,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT essay_comparisons_student_ids_check CHECK (array_length(student_ids, 1) >= 2)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS essay_comparisons_activity_id_idx ON essay_comparisons(activity_id);
CREATE INDEX IF NOT EXISTS essay_comparisons_user_id_idx ON essay_comparisons(user_id);
CREATE INDEX IF NOT EXISTS essay_comparisons_created_at_idx ON essay_comparisons(created_at DESC);

-- Enable Row Level Security
ALTER TABLE essay_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own comparisons"
  ON essay_comparisons FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own comparisons"
  ON essay_comparisons FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update their own comparisons"
  ON essay_comparisons FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own comparisons"
  ON essay_comparisons FOR DELETE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
