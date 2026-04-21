-- migrate_teacher_ids.sql
-- Run this in Supabase SQL Editor to convert legacy UUID teacher_ids 
-- to the new numeric IDs from the public.users table.

BEGIN;

-- 1. Helper to safely convert a table
-- This script assumes your 'users.id' is now BIGINT/INT 
-- and your legacy 'teacher_id' columns are still UUID/TEXT.

-- Convert teacher_course_loads
DO $$ 
BEGIN 
    -- Check if we need to change the type to BIGINT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teacher_course_loads' 
        AND column_name = 'teacher_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Add temporary numeric column
        ALTER TABLE teacher_course_loads ADD COLUMN teacher_id_new BIGINT;
        
        -- Update it with numeric IDs from users table
        UPDATE teacher_course_loads t
        SET teacher_id_new = u.id
        FROM users u
        WHERE t.teacher_id = u.auth_user_id;
        
        -- Switch columns
        ALTER TABLE teacher_course_loads DROP COLUMN teacher_id;
        ALTER TABLE teacher_course_loads RENAME COLUMN teacher_id_new TO teacher_id;
    END IF;
END $$;

-- Convert courses
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'teacher_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE courses ADD COLUMN teacher_id_new BIGINT;
        
        UPDATE courses c
        SET teacher_id_new = u.id
        FROM users u
        WHERE c.teacher_id = u.auth_user_id;
        
        ALTER TABLE courses DROP COLUMN teacher_id;
        ALTER TABLE courses RENAME COLUMN teacher_id_new TO teacher_id;
    END IF;
END $$;

-- Convert rubrics
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rubrics' 
        AND column_name = 'teacher_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE rubrics ADD COLUMN teacher_id_new BIGINT;
        
        UPDATE rubrics r
        SET teacher_id_new = u.id
        FROM users u
        WHERE r.teacher_id = u.auth_user_id;
        
        ALTER TABLE rubrics DROP COLUMN teacher_id;
        ALTER TABLE rubrics RENAME COLUMN teacher_id_new TO teacher_id;
    END IF;
END $$;

-- Convert blocks
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blocks' 
        AND column_name = 'teacher_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE blocks ADD COLUMN teacher_id_new BIGINT;
        
        UPDATE blocks b
        SET teacher_id_new = u.id
        FROM users u
        WHERE b.teacher_id = u.auth_user_id;
        
        ALTER TABLE blocks DROP COLUMN teacher_id;
        ALTER TABLE blocks RENAME COLUMN teacher_id_new TO teacher_id;
    END IF;
END $$;

COMMIT;
