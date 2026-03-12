--------------------------------------------------------------------------------
-- Essays table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essays (
  id                bigserial PRIMARY KEY,
  student_id        bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id           bigint      REFERENCES users(id) ON DELETE SET NULL,
  section_id        bigint      REFERENCES sections(id) ON DELETE SET NULL,
  activity_id       bigint      REFERENCES essay_activities(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  content           text,
  file_path         text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  status            text        NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'analyzed', 'reviewed')),
  grammar_score           numeric,
  readability_score       numeric,
  coherence_score         numeric,
  argument_strength_score numeric,
  overall_score           numeric,
  grammar_errors          jsonb,
  style_issues            jsonb,
  argument_analysis       jsonb,
  analysis_payload        jsonb
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS essays_user_id_idx ON essays(user_id);

-- Enable Row Level Security
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own essays" 
ON essays FOR SELECT TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can create essays" 
ON essays FOR INSERT TO authenticated WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can update their own essays" 
ON essays FOR UPDATE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
) WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can delete their own essays" 
ON essays FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);


