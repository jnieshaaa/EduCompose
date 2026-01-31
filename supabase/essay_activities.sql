--------------------------------------------------------------------------------
-- Essay Activities table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_activities (
  id           bigserial PRIMARY KEY,
  teacher_id   bigint      REFERENCES users(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  program_id   bigint      REFERENCES programs(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  rubric_id    bigint      REFERENCES rubrics(id) ON DELETE SET NULL,
  due_date     date,
  instructions text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE essay_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own activities" 
ON essay_activities FOR SELECT TO authenticated USING (
  teacher_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can create activities" 
ON essay_activities FOR INSERT TO authenticated WITH CHECK (
  teacher_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can update their own activities" 
ON essay_activities FOR UPDATE TO authenticated USING (
  teacher_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
) WITH CHECK (
  teacher_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can delete their own activities" 
ON essay_activities FOR DELETE TO authenticated USING (
  teacher_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

