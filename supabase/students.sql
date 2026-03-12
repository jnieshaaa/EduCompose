--------------------------------------------------------------------------------
-- Students table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           bigserial PRIMARY KEY,
  student_code text        NOT NULL,
  first_name   text        NOT NULL,
  middle_name  text,
  last_name    text        NOT NULL,
  email        text,
  program_id   uuid        REFERENCES programs_lookup(id) ON DELETE SET NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_code)
);

-- Create unique index on email (allows multiple NULL values but prevents duplicate non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique_idx 
ON students (email) 
WHERE email IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create index for program_id
CREATE INDEX IF NOT EXISTS students_program_id_idx ON students(program_id);

-- RLS Policies
-- Everyone (authenticated) can view all students (adjust as needed for privacy/scaling)
CREATE POLICY "Allow select for authenticated users" 
ON students FOR SELECT TO authenticated USING (true);

-- Only teachers/admins can modify
CREATE POLICY "Allow insert for authenticated users with teacher role" 
ON students FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);

CREATE POLICY "Allow update for authenticated users with teacher role" 
ON students FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);

CREATE POLICY "Allow delete for authenticated users with teacher role" 
ON students FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);


