-- Add enrollment_status to students table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
        CREATE TYPE student_status AS ENUM ('active', 'dropped', 'graduated');
    END IF;
END $$;

ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_status student_status NOT NULL DEFAULT 'active';

-- Sync is_active with enrollment_status (if someone was inactive, mark as dropped as a guess, or just keep as is)
-- But for new functionality, we want is_active to be true only if status is active
UPDATE students SET is_active = (enrollment_status = 'active');

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON students(enrollment_status);
