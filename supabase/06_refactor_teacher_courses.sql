--------------------------------------------------------------------------------
-- Migration: Refactor teachers and courses
--------------------------------------------------------------------------------

-- 1. Fix Users Table (Add UUID columns for school and department)
DO $$ 
BEGIN 
    -- Add school_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'school_id') THEN
        ALTER TABLE users ADD COLUMN school_id uuid REFERENCES schools(id);
    END IF;

    -- Add department_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_id') THEN
        ALTER TABLE users ADD COLUMN department_id uuid REFERENCES departments(id);
    END IF;
END $$;

-- Try to migrate data from school/department text columns if they are UUIDs
UPDATE users 
SET 
  school_id = school::uuid,
  department_id = department::uuid
WHERE 
  school IS NOT NULL AND school ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND department IS NOT NULL AND department ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Refactor Sections and Essay Activities
-- Add course_id (UUID) to sections and essay_activities
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sections' AND column_name = 'course_id') THEN
        ALTER TABLE sections ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'course_id') THEN
        ALTER TABLE essay_activities ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make program_id optional
ALTER TABLE sections ALTER COLUMN program_id DROP NOT NULL;
ALTER TABLE essay_activities ALTER COLUMN program_id DROP NOT NULL;


-- 3. Update Unique Constraints for Sections
-- Remove old constraint
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_program_id_name_term_key;

-- Add new constraint (Allowing same block in different courses)
-- Note: We use course_id instead of program_id now
ALTER TABLE sections ADD CONSTRAINT sections_course_id_name_term_key UNIQUE (course_id, name, term);

-- 4. Ensure RLS for courses is correct for teachers
-- (Already seems okay in 05_school_management.sql but let's be sure)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON courses;
CREATE POLICY "Allow all for authenticated users" ON courses FOR ALL TO authenticated USING (true);
