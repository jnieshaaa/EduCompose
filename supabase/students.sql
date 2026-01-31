--------------------------------------------------------------------------------
-- Students table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           bigserial PRIMARY KEY,
  student_code text        NOT NULL,
  first_name   text        NOT NULL,
  middle_name  text,
  last_name    text        NOT NULL,
  full_name    text        GENERATED ALWAYS AS (
    trim(both ' ' from (
      first_name || ' ' || coalesce(middle_name || ' ', '') || last_name
    ))
  ) STORED,
  email        text,
  program_id   bigint      REFERENCES programs(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
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

-- RLS Policies
CREATE POLICY "Teachers can view all students" 
ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create students" 
ON students FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update students" 
ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete students" 
ON students FOR DELETE TO authenticated USING (true);

