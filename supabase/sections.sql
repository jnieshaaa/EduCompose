--------------------------------------------------------------------------------
-- Sections table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sections (
  id                bigserial PRIMARY KEY,
  program_id        uuid        REFERENCES programs_lookup(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  term              text,
  students_estimated integer     DEFAULT 0,
  essays_estimated   integer     DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, name, term)
);

-- Enable Row Level Security
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Create index for program_id
CREATE INDEX IF NOT EXISTS sections_program_id_idx ON sections(program_id);

-- RLS Policies
CREATE POLICY "Allow select for authenticated users" 
ON sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users with teacher role" 
ON sections FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);

CREATE POLICY "Allow update for authenticated users with teacher role" 
ON sections FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);

CREATE POLICY "Allow delete for authenticated users with teacher role" 
ON sections FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('teacher', 'admin'))
);


