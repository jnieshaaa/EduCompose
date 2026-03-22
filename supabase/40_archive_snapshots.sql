--------------------------------------------------------------------------------
-- Archive Snapshot System
-- This table stores a "frozen" copy of student metadata (year, block, program)
-- for archival purposes, so future changes to the students table don't corrupt history.
--------------------------------------------------------------------------------

-- Create student archives table
CREATE TABLE IF NOT EXISTS student_archives (
  id            bigserial PRIMARY KEY,
  student_id    bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year text        NOT NULL,
  term          text        NOT NULL,
  program_id    uuid        REFERENCES programs_lookup(id) ON DELETE SET NULL,
  year_level    int         NOT NULL,
  block_name    text,
  enrollment_status student_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Ensure only one archive record PER student PER term
  UNIQUE (student_id, academic_year, term)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_student_archives_academic_context ON student_archives(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_student_archives_student ON student_archives(student_id);
CREATE INDEX IF NOT EXISTS idx_student_archives_program ON student_archives(program_id);

-- Enable RLS
ALTER TABLE student_archives ENABLE ROW LEVEL SECURITY;

-- Standard policies
CREATE POLICY "Allow select for authenticated users on student_archives" 
ON student_archives FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete restricted to teachers/admins
CREATE POLICY "Allow all for teachers on student_archives" 
ON student_archives FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);

--------------------------------------------------------------------------------
-- Archive Snapshot Helper Functions
--------------------------------------------------------------------------------

-- Function to manually snapshot all current active students for a specific term
-- This should be called by the admin when a semester ends.
CREATE OR REPLACE FUNCTION archive_current_term_students(p_ay text, p_term text)
RETURNS void AS $$
BEGIN
  INSERT INTO student_archives (student_id, academic_year, term, program_id, year_level, block_name, enrollment_status)
  SELECT 
    id, 
    p_ay, 
    p_term, 
    program_id, 
    year, 
    block_name, 
    enrollment_status
  FROM students
  WHERE is_active = true
  ON CONFLICT (student_id, academic_year, term) DO UPDATE 
  SET 
    program_id = EXCLUDED.program_id,
    year_level = EXCLUDED.year_level,
    block_name = EXCLUDED.block_name,
    enrollment_status = EXCLUDED.enrollment_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
