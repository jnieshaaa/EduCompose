-- Create pending student registrations table
CREATE TABLE IF NOT EXISTS pending_student_registrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES users(auth_user_id) ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES programs_lookup(id) ON DELETE CASCADE,
  student_code text NOT NULL,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  middle_name  text,
  email        text NOT NULL,
  year         integer NOT NULL,
  block_name   text NOT NULL,
  academic_year text NOT NULL,
  term         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  processed    boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  -- Ensure a student code isn't repeated in the pending list for the same academic context
  CONSTRAINT unique_pending_student UNIQUE (student_code, academic_year, term, processed)
);

-- Enable RLS
ALTER TABLE pending_student_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow teachers to insert their own pending registrations"
ON pending_student_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Allow teachers to view their own pending registrations"
ON pending_student_registrations FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Allow admins full access to pending registrations"
ON pending_student_registrations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  )
);
