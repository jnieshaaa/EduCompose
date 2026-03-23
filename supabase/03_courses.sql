--------------------------------------------------------------------------------
-- 03_courses.sql — Courses lookup + Teacher course loads
--------------------------------------------------------------------------------

-- Courses Lookup (global catalog)
CREATE TABLE IF NOT EXISTS courses_lookup (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for authenticated" ON courses_lookup FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON courses_lookup FOR ALL TO authenticated USING (true);

-- Teacher Course Loads (which courses a teacher handles per AY/term)
CREATE TABLE IF NOT EXISTS teacher_course_loads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES users(auth_user_id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES courses_lookup(id) ON DELETE CASCADE,
  academic_year text,
  term          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, course_id, academic_year, term)
);

ALTER TABLE teacher_course_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own loads"
  ON teacher_course_loads FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage their loads"
  ON teacher_course_loads FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX IF NOT EXISTS tcl_teacher_id_idx ON teacher_course_loads(teacher_id);
CREATE INDEX IF NOT EXISTS tcl_course_id_idx ON teacher_course_loads(course_id);
