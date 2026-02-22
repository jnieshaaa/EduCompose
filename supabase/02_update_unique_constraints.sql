--------------------------------------------------------------------------------
-- Migration: Update uniqueness constraints for multi-tenancy
-- Allows different teachers to use the same Program names and Student IDs
--------------------------------------------------------------------------------

-- 1. Update Programs Uniqueness
-- Remove global unique identifier on name if it exists
DO $$ 
BEGIN
    -- Drop constraint if it exists (check standard naming)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_name_key') THEN
        ALTER TABLE programs DROP CONSTRAINT programs_name_key;
    END IF;
    
    -- Drop indexes that force global uniqueness on name
    -- "programs_name_unique_idx" was causing the conflict for the user
    DROP INDEX IF EXISTS programs_name_idx;
    DROP INDEX IF EXISTS programs_name_unique_idx;
END $$;

-- Add composite unique constraint (name + created_by)
-- This allows "Math 101" for Teacher A and "Math 101" for Teacher B
CREATE UNIQUE INDEX IF NOT EXISTS programs_name_created_by_idx 
ON programs (name, created_by);


-- 2. Update Students Uniqueness
-- Remove global unique identifier on student_code
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_student_code_key') THEN
        ALTER TABLE students DROP CONSTRAINT students_student_code_key;
    END IF;
    -- Drop any potential unique indexes on student_code
    DROP INDEX IF EXISTS students_student_code_key;
    DROP INDEX IF EXISTS students_student_code_unique_idx;
END $$;

-- Add composite unique constraint (student_code + created_by)
-- Note: we need created_by on students first!
-- Check if students table has created_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE students ADD COLUMN created_by bigint;
        CREATE INDEX IF NOT EXISTS students_created_by_idx ON students(created_by);
    END IF;
END $$;

-- Now add the index
CREATE UNIQUE INDEX IF NOT EXISTS students_student_code_created_by_idx 
ON students (student_code, created_by);

-- Also fix Email uniqueness to be per-teacher (if desired) or keep global?
-- Usually email should be unique per user in the system, but here students are just records.
-- If Teacher A adds "john@example.com" and Teacher B adds "john@example.com", are they the same row?
-- Current logic inserts new row. So we should Relax the email unique constraint too.

DO $$ 
BEGIN
    -- Drop existing email index
    DROP INDEX IF EXISTS students_email_unique_idx;
    DROP INDEX IF EXISTS students_email_key;
END $$;

-- Add per-teacher email uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS students_email_created_by_idx 
ON students (email, created_by) 
WHERE email IS NOT NULL;


-- 3. Update Sections Uniqueness
-- Sections are already scoped by program_id, and programs are now scoped by created_by.
-- So sections are safe (program_id + name + term) implies (created_by + name + term).
