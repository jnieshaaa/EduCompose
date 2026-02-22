--------------------------------------------------------------------------------
-- Programs table
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS programs (
  id             bigserial PRIMARY KEY,
  name           text        NOT NULL,
  description    text,
  tracks         integer     DEFAULT 0,
  courses        integer     DEFAULT 0,
  avg_class_size integer     DEFAULT 0,
  status         text        NOT NULL DEFAULT 'Active',
  created_by     bigint,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS programs_created_by_idx ON programs(created_by);

-- Enable Row Level Security
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers can view all programs" ON programs;
CREATE POLICY "Teachers can view all programs" 
ON programs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers can create programs" ON programs;
CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can update programs" ON programs;
CREATE POLICY "Teachers can update programs" 
ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers can delete programs" ON programs;
CREATE POLICY "Teachers can delete programs" 
ON programs FOR DELETE TO authenticated USING (true);

