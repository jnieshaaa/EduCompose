--------------------------------------------------------------------------------
-- Migration: Cleanup Programs and Teachers Tables
-- Purpose: Remove all references to the deleted 'programs' and 'teachers' tables
-- - Update foreign keys to use 'programs_lookup' (uuid) instead of 'programs' (bigint)
-- - Ensure all teacher references use the 'users' table
--------------------------------------------------------------------------------

-- 1. UPDATE STUDENTS TABLE
-- Replace programs(id) reference with programs_lookup(id)
DO $$ 
BEGIN 
    -- Drop old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_program_id_fkey' 
        AND table_name = 'students'
    ) THEN
        ALTER TABLE students DROP CONSTRAINT students_program_id_fkey;
    END IF;

    -- Change column type from bigint to uuid (data will be lost, set to NULL)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'program_id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE students ALTER COLUMN program_id TYPE uuid USING NULL;
    END IF;

    -- Add new foreign key to programs_lookup
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_program_id_lookup_fkey' 
        AND table_name = 'students'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT students_program_id_lookup_fkey 
        FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. UPDATE SECTIONS TABLE
-- Replace programs(id) reference with programs_lookup(id)
DO $$ 
BEGIN 
    -- Drop old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_program_id_fkey' 
        AND table_name = 'sections'
    ) THEN
        ALTER TABLE sections DROP CONSTRAINT sections_program_id_fkey;
    END IF;

    -- Change column type from bigint to uuid (data will be lost, set to NULL)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sections' 
        AND column_name = 'program_id' 
        AND data_type = 'bigint'
    ) THEN
        -- First, make it nullable temporarily
        ALTER TABLE sections ALTER COLUMN program_id DROP NOT NULL;
        -- Then change type
        ALTER TABLE sections ALTER COLUMN program_id TYPE uuid USING NULL;
    END IF;

    -- Add new foreign key to programs_lookup
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sections_program_id_lookup_fkey' 
        AND table_name = 'sections'
    ) THEN
        ALTER TABLE sections ADD CONSTRAINT sections_program_id_lookup_fkey 
        FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. UPDATE ESSAY_ACTIVITIES TABLE
-- Replace programs(id) reference with programs_lookup(id)
DO $$ 
BEGIN 
    -- Drop old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'essay_activities_program_id_fkey' 
        AND table_name = 'essay_activities'
    ) THEN
        ALTER TABLE essay_activities DROP CONSTRAINT essay_activities_program_id_fkey;
    END IF;

    -- Change column type from bigint to uuid (data will be lost, set to NULL)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_activities' 
        AND column_name = 'program_id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE essay_activities ALTER COLUMN program_id TYPE uuid USING NULL;
    END IF;

    -- Add new foreign key to programs_lookup
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'essay_activities_program_id_lookup_fkey' 
        AND table_name = 'essay_activities'
    ) THEN
        ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_program_id_lookup_fkey 
        FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;
    END IF;

    -- Ensure teacher_id references users(id) correctly
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'essay_activities_teacher_id_fkey' 
        AND table_name = 'essay_activities'
    ) THEN
        -- Check if it's already correct
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage
            WHERE constraint_name = 'essay_activities_teacher_id_fkey'
            AND table_name = 'users'
        ) THEN
            -- If not referencing users table, we need to fix it
            ALTER TABLE essay_activities DROP CONSTRAINT essay_activities_teacher_id_fkey;
            ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_teacher_id_fkey 
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    ELSE
        -- Constraint doesn't exist, add it
        ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_teacher_id_fkey 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. UPDATE RUBRICS TABLE
-- Note: rubrics.programs is a JSONB column and doesn't have a foreign key constraint
-- It stores program IDs as JSON data, which won't cause FK errors
-- But document that it should be updated in application code to use programs_lookup UUIDs

-- 5. DROP OLD TABLES (if they still exist and are empty)
-- Only drop if you're sure you don't need the data
-- Uncomment these lines if you want to drop the tables:

-- DROP TABLE IF EXISTS programs CASCADE;
-- DROP TABLE IF EXISTS teachers CASCADE;

-- 6. CLEAN UP OLD MIGRATION FILES REFERENCES
-- Note: The following files contain references to 'programs' table:
-- - programs.sql (entire file can be removed)
-- - 01_add_created_by_to_programs.sql (can be removed)
-- - 03_remove_excluded_program_fields.sql (can be removed)

COMMENT ON TABLE students IS 'Students table - program_id now references programs_lookup(id) instead of programs(id)';
COMMENT ON TABLE sections IS 'Sections table - program_id now references programs_lookup(id) instead of programs(id)';
COMMENT ON TABLE essay_activities IS 'Essay activities table - program_id now references programs_lookup(id) and teacher_id references users(id)';
COMMENT ON COLUMN rubrics.programs IS 'JSONB column storing program data - should use programs_lookup UUIDs in application code';
