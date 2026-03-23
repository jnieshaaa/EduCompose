--------------------------------------------------------------------------------
-- 07_rubrics.sql — Rubrics table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rubrics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  criteria          jsonb,
  programs          jsonb DEFAULT '[]'::jsonb,
  grading_intensity text,
  teacher_id        uuid REFERENCES users(auth_user_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all rubrics"
  ON rubrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can manage their own rubrics"
  ON rubrics FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR teacher_id IS NULL)
  WITH CHECK (teacher_id = auth.uid() OR teacher_id IS NULL);

CREATE INDEX IF NOT EXISTS rubrics_teacher_id_idx ON rubrics(teacher_id);
