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
  onboarding_completed boolean NOT NULL DEFAULT false,
  birthday         text,
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

--------------------------------------------------------------------------------
-- RPC: get_student_login_email
-- Used by StudentLogin.tsx to look up a student's email by student code.
-- Returns a single row with student identity info for authentication.
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_student_login_email(text);
CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_code text)
RETURNS TABLE (
  student_id   uuid,
  student_code text,
  email        text,
  first_name   text,
  middle_name  text,
  last_name    text,
  is_active    boolean,
  birthday     text,
  onboarding_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.student_code,
    s.email,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.is_active,
    s.birthday,
    s.onboarding_completed
  FROM public.students s
  WHERE upper(trim(s.student_code)) = upper(trim(p_student_code))
    AND s.is_active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO authenticated;
