--------------------------------------------------------------------------------
-- rename_teacher_columns.sql
-- Run this in the Supabase SQL Editor to standardize teacher identification.
--------------------------------------------------------------------------------

-- 1. Fix rubrics table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rubrics' AND column_name = 'user_id') THEN
        ALTER TABLE rubrics RENAME COLUMN user_id TO teacher_id;
    END IF;
END $$;

-- 2. Fix courses table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'user_id') THEN
        ALTER TABLE courses RENAME COLUMN user_id TO teacher_id;
    END IF;
END $$;

-- 3. Update Indexes (Optional but Recommended)
DROP INDEX IF EXISTS rubrics_user_id_idx;
CREATE INDEX IF NOT EXISTS rubrics_teacher_id_idx ON rubrics(teacher_id);

DROP INDEX IF EXISTS courses_user_id_idx;
CREATE INDEX IF NOT EXISTS courses_teacher_id_idx ON courses(teacher_id);
