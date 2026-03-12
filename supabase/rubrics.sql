--------------------------------------------------------------------------------
-- Rubrics table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rubrics (
  id               bigserial PRIMARY KEY,
  name             text        NOT NULL,
  description      text,
  criteria         jsonb,
  programs         jsonb        DEFAULT '[]'::jsonb,
  grading_intensity text,
  user_id          bigint      REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS rubrics_user_id_idx ON rubrics(user_id);

-- Enable Row Level Security
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all rubrics" 
ON rubrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create rubrics" 
ON rubrics FOR INSERT TO authenticated WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR user_id IS NULL
);

CREATE POLICY "Users can update their own rubrics" 
ON rubrics FOR UPDATE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR user_id IS NULL
) WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR user_id IS NULL
);

CREATE POLICY "Users can delete their own rubrics" 
ON rubrics FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR user_id IS NULL
);


