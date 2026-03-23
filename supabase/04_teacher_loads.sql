--------------------------------------------------------------------------------
-- 04_teacher_loads.sql — Program loads, Blocks, Block-Students
--------------------------------------------------------------------------------

-- Teacher Program Loads (which programs under a course load)
CREATE TABLE IF NOT EXISTS teacher_program_loads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_load_id uuid NOT NULL REFERENCES teacher_course_loads(id) ON DELETE CASCADE,
  program_id     uuid NOT NULL REFERENCES programs_lookup(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_load_id, program_id)
);

ALTER TABLE teacher_program_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own program loads"
  ON teacher_program_loads FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_course_loads
      WHERE id = teacher_program_loads.course_load_id
      AND teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_course_loads
      WHERE id = teacher_program_loads.course_load_id
      AND teacher_id = auth.uid()
    )
  );

-- Admin access to teacher_program_loads
CREATE POLICY "Admins can manage all program loads"
  ON teacher_program_loads FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS tpl_course_load_id_idx ON teacher_program_loads(course_load_id);

-- Blocks (sections within a program load)
CREATE TABLE IF NOT EXISTS blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_load_id uuid NOT NULL REFERENCES teacher_program_loads(id) ON DELETE CASCADE,
  year            integer NOT NULL CHECK (year BETWEEN 1 AND 5),
  name            text NOT NULL,  -- e.g. 'A', 'B', 'C'
  teacher_id      uuid REFERENCES users(auth_user_id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_load_id, year, name)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own blocks"
  ON blocks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_program_loads tpl
      JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
      WHERE tpl.id = blocks.program_load_id
      AND tcl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_program_loads tpl
      JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
      WHERE tpl.id = blocks.program_load_id
      AND tcl.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all blocks"
  ON blocks FOR ALL TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS blocks_program_load_id_idx ON blocks(program_load_id);

-- Block Students (many-to-many: blocks ↔ students)
CREATE TABLE IF NOT EXISTS block_students (
  block_id   uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, student_id)
);

ALTER TABLE block_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their block_students"
  ON block_students FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blocks b
      JOIN teacher_program_loads tpl ON b.program_load_id = tpl.id
      JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
      WHERE b.id = block_students.block_id
      AND tcl.teacher_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS bs_block_id_idx ON block_students(block_id);
CREATE INDEX IF NOT EXISTS bs_student_id_idx ON block_students(student_id);
