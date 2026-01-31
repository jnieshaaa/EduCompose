--------------------------------------------------------------------------------
-- Sections table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sections (
  id                bigserial PRIMARY KEY,
  program_id        bigint      NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  term              text,
  students_estimated integer     DEFAULT 0,
  essays_estimated   integer     DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, name, term)
);

-- Enable Row Level Security
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view all sections" 
ON sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update sections" 
ON sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete sections" 
ON sections FOR DELETE TO authenticated USING (true);

