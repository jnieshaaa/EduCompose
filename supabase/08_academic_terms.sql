--------------------------------------------------------------------------------
-- Migration: Academic Term Management
--------------------------------------------------------------------------------

-- Create academic_settings table
CREATE TABLE IF NOT EXISTS academic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ay_start int NOT NULL,
  ay_end int NOT NULL,
  current_semester text NOT NULL, -- '1st Semester', '2nd Semester', 'Summer'
  
  first_sem_start_month text,
  first_sem_end_month text,
  
  second_sem_start_month text,
  second_sem_end_month text,
  
  summer_start_month text,
  summer_end_month text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO academic_settings (
  ay_start, ay_end, current_semester,
  first_sem_start_month, first_sem_end_month,
  second_sem_start_month, second_sem_end_month,
  summer_start_month, summer_end_month
) VALUES (
  2025, 2026, '1st Semester',
  'August', 'December',
  'January', 'May',
  'June', 'July'
) ON CONFLICT DO NOTHING;

-- Add academic columns to sections
ALTER TABLE sections ADD COLUMN IF NOT EXISTS academic_year text;

-- Add academic columns to essay_activities
ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS term text;

-- Add academic columns to teacher_course_loads
ALTER TABLE teacher_course_loads ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE teacher_course_loads ADD COLUMN IF NOT EXISTS term text;

-- Update unique constraint for teacher_course_loads
-- First remove the old one
ALTER TABLE teacher_course_loads DROP CONSTRAINT IF EXISTS teacher_course_loads_teacher_id_course_id_key;
-- Add new one
ALTER TABLE teacher_course_loads ADD CONSTRAINT teacher_course_loads_unique_per_term UNIQUE(teacher_id, course_id, academic_year, term);

-- RLS for academic_settings
ALTER TABLE academic_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select for all authenticated' AND tablename = 'academic_settings') THEN
        CREATE POLICY "Allow select for all authenticated" ON academic_settings FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for admins' AND tablename = 'academic_settings') THEN
        CREATE POLICY "Allow all for admins" ON academic_settings FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
