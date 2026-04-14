--------------------------------------------------------------------------------
-- 05_students.sql — Students table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code text NOT NULL UNIQUE,
  first_name   text NOT NULL,
  middle_name  text,
  last_name    text NOT NULL,
  email        text,
  program_id   uuid REFERENCES programs_lookup(id) ON DELETE SET NULL,
  year         integer,
  block_name   text,
  teacher_id   uuid REFERENCES users(auth_user_id) ON DELETE CASCADE,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  enrollment_status text NOT NULL DEFAULT 'active',
  is_active        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Allow multiple NULLs but no duplicate non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique_idx
  ON students (email) WHERE email IS NOT NULL;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers see only their own students
CREATE POLICY "Teachers can manage their own students"
  ON students FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Admins see all
CREATE POLICY "Admins can manage all students"
  ON students FOR ALL TO authenticated USING (is_admin());

-- Students can view themselves
CREATE POLICY "Students can view themselves"
  ON students FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'student'
      AND email = students.email
    )
  );

CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON students(teacher_id);
CREATE INDEX IF NOT EXISTS students_program_id_idx ON students(program_id);
