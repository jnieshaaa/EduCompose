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
  created_by       bigint      REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view all rubrics" 
ON rubrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create rubrics" 
ON rubrics FOR INSERT TO authenticated WITH CHECK (
  created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

CREATE POLICY "Teachers can update their own rubrics" 
ON rubrics FOR UPDATE TO authenticated USING (
  created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
) WITH CHECK (
  created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

CREATE POLICY "Teachers can delete their own rubrics" 
ON rubrics FOR DELETE TO authenticated USING (
  created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

