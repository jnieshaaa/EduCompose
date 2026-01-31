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
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view all programs" 
ON programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update programs" 
ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete programs" 
ON programs FOR DELETE TO authenticated USING (true);

