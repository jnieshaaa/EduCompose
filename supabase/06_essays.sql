--------------------------------------------------------------------------------
-- 06_essays.sql — Activities, Essays, Analysis Results, Comparisons
--------------------------------------------------------------------------------

-- Essay Activities (assignments created by teachers)
CREATE TABLE IF NOT EXISTS essay_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  program_load_id uuid REFERENCES teacher_program_loads(id) ON DELETE SET NULL,
  block_id        uuid REFERENCES blocks(id) ON DELETE SET NULL,
  rubric_id       uuid REFERENCES rubrics(id) ON DELETE SET NULL,
  deadline        timestamptz,
  min_word_count  integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE essay_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their activities"
  ON essay_activities FOR ALL TO authenticated
  USING (
    block_id IN (
      SELECT b.id FROM blocks b
      JOIN teacher_program_loads tpl ON b.program_load_id = tpl.id
      JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
      WHERE tcl.teacher_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Students can view assigned activities"
  ON essay_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM block_students bs
      WHERE bs.block_id = essay_activities.block_id
      AND bs.student_id IN (
        SELECT s.id FROM students s
        JOIN users u ON u.email = s.email
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS ea_block_id_idx ON essay_activities(block_id);
CREATE INDEX IF NOT EXISTS ea_rubric_id_idx ON essay_activities(rubric_id);

-- Essays (student submissions)
CREATE TABLE IF NOT EXISTS essays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES essay_activities(id) ON DELETE SET NULL,
  title       text NOT NULL,
  content     text,
  status      text NOT NULL DEFAULT 'submitted',
  score       numeric,
  analysis    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage essays of their students"
  ON essays FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Students can manage their own essays"
  ON essays FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN users u ON u.email = s.email
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS essays_student_id_idx ON essays(student_id);
CREATE INDEX IF NOT EXISTS essays_activity_id_idx ON essays(activity_id);

-- Essay Analysis Results
CREATE TABLE IF NOT EXISTS essay_analysis_results (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id                uuid NOT NULL REFERENCES essays(id) ON DELETE CASCADE UNIQUE,
  student_id              uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id             uuid REFERENCES essay_activities(id) ON DELETE SET NULL,
  analysis_type           text NOT NULL DEFAULT 'comprehensive',
  word_count              integer,
  grammar_score           numeric,
  readability_score       numeric,
  coherence_score         numeric,
  argument_strength_score numeric,
  knowledge_graph_score   numeric,
  overall_score           numeric,
  detailed_analysis       jsonb NOT NULL,
  recommendations         jsonb,
  diagnostic_summary      jsonb,
  rubric_scores           jsonb,
  original_text           text,
  processing_time_seconds numeric,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE essay_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage analysis results"
  ON essay_analysis_results FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid())
    OR is_admin()
  );

CREATE INDEX IF NOT EXISTS ear_essay_id_idx ON essay_analysis_results(essay_id);
CREATE INDEX IF NOT EXISTS ear_student_id_idx ON essay_analysis_results(student_id);

-- Essay Comparisons
CREATE TABLE IF NOT EXISTS essay_comparisons (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id           uuid NOT NULL REFERENCES essay_activities(id) ON DELETE CASCADE,
  student_ids           uuid[] NOT NULL,
  essay_ids             uuid[] NOT NULL,
  insights              text NOT NULL,
  similarity_highlights jsonb NOT NULL,
  similarity_score      numeric,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE essay_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage comparisons"
  ON essay_comparisons FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS ec_activity_id_idx ON essay_comparisons(activity_id);
