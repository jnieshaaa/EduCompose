-- Add onboarding_completed column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS students_onboarding_completed_idx ON students(onboarding_completed);
