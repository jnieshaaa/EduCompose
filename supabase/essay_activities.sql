--------------------------------------------------------------------------------
-- Essay Activities table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_activities (
  id           bigserial PRIMARY KEY,
  user_id      bigint      REFERENCES users(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  program_id   uuid        REFERENCES programs_lookup(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  rubric_id    bigint      REFERENCES rubrics(id) ON DELETE SET NULL,
  due_date     date,
  instructions text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS essay_activities_user_id_idx ON essay_activities(user_id);

-- Enable Row Level Security
ALTER TABLE essay_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activities" 
ON essay_activities FOR SELECT TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can create activities" 
ON essay_activities FOR INSERT TO authenticated WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can update their own activities" 
ON essay_activities FOR UPDATE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
) WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Users can delete their own activities" 
ON essay_activities FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);


