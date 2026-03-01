--------------------------------------------------------------------------------
-- School Management Tables
-- Stores schools, departments, and programs for use in onboarding
--------------------------------------------------------------------------------

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  code         text UNIQUE NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         text NOT NULL,
  code         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);

-- Create programs_lookup table (to avoid conflict with teacher programs table)
CREATE TABLE IF NOT EXISTS programs_lookup (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  abbr          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs_lookup ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone (authenticated) can view
CREATE POLICY "Allow select for authenticated users" ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for authenticated users" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for authenticated users" ON programs_lookup FOR SELECT TO authenticated USING (true);

-- Only admins can modify (we'll use a simple approach for now, assuming admin checks are done via the app or we can add more complex RLS if needed)
-- Since we don't have a reliable way to check the 'role' text column in RLS without joining public.users every time, 
-- we will allow all authenticated users for now, but the frontend will restrict access to the Admin role.
-- For production, we would use a more secure RLS.
CREATE POLICY "Allow all for authenticated users" ON schools FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON departments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON programs_lookup FOR ALL TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS schools_code_idx ON schools(code);
CREATE INDEX IF NOT EXISTS departments_school_id_idx ON departments(school_id);
CREATE INDEX IF NOT EXISTS programs_lookup_department_id_idx ON programs_lookup(department_id);

-- Insert initial data from schoolData.ts
INSERT INTO schools (name, code) VALUES ('Laguna University', 'LU') ON CONFLICT (code) DO NOTHING;

-- Insert departments for LU
DO $$
DECLARE
    school_id_lu uuid;
BEGIN
    SELECT id INTO school_id_lu FROM schools WHERE code = 'LU';
    
    INSERT INTO departments (school_id, name, code) VALUES 
    (school_id_lu, 'College of Arts and Sciences', 'CAS'),
    (school_id_lu, 'College of Business, Administration and Accountancy', 'CBAA'),
    (school_id_lu, 'College of Computing Studies', 'CSS'),
    (school_id_lu, 'College of Education', 'CoEd'),
    (school_id_lu, 'College of Engineering', 'CoEng')
    ON CONFLICT (school_id, code) DO NOTHING;
END $$;

-- Insert programs for CSS
DO $$
DECLARE
    dept_id_css uuid;
BEGIN
    SELECT d.id INTO dept_id_css 
    FROM departments d 
    JOIN schools s ON d.school_id = s.id 
    WHERE d.code = 'CSS' AND s.code = 'LU';
    
    INSERT INTO programs_lookup (department_id, name, abbr) VALUES 
    (dept_id_css, 'Bachelor of Science in Computer Science', 'BSCS'),
    (dept_id_css, 'Bachelor of Science in Information Technology', 'BSIT')
    ON CONFLICT DO NOTHING;
END $$;
