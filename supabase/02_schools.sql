--------------------------------------------------------------------------------
-- 02_schools.sql — Schools, Departments, Programs
--------------------------------------------------------------------------------

-- Schools
CREATE TABLE IF NOT EXISTS schools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  address    text,
  logo_url   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for authenticated" ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON schools FOR ALL TO authenticated USING (true);

-- Link users.school_id FK now that schools exists
ALTER TABLE users ADD CONSTRAINT users_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       text NOT NULL,
  code       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for authenticated" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON departments FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS departments_school_id_idx ON departments(school_id);

-- Programs Lookup
CREATE TABLE IF NOT EXISTS programs_lookup (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  abbr          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE programs_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for authenticated" ON programs_lookup FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON programs_lookup FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS programs_lookup_department_id_idx ON programs_lookup(department_id);

-- Seed data (Laguna University)
INSERT INTO schools (name) VALUES ('Laguna University') ON CONFLICT DO NOTHING;
