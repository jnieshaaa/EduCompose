--------------------------------------------------------------------------------
-- Migration: Support Multiple Assignments in a Single Activity
--------------------------------------------------------------------------------

DO $$ 
BEGIN
    -- 0. Drop existing foreign key constraints that will be broken by array conversion
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_course_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_program_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_block_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_section_id_fkey;

    -- 1. Convert course_id to uuid array
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'course_id') THEN
        IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'course_id') != 'ARRAY' THEN
            ALTER TABLE essay_activities ALTER COLUMN course_id TYPE uuid[] USING ARRAY[course_id]::uuid[];
        END IF;
    ELSE
        ALTER TABLE essay_activities ADD COLUMN course_id uuid[];
    END IF;

    -- 2. Convert program_id to uuid array
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'program_id') THEN
        IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'program_id') != 'ARRAY' THEN
            ALTER TABLE essay_activities ALTER COLUMN program_id TYPE uuid[] USING ARRAY[program_id]::uuid[];
        END IF;
    ELSE
        ALTER TABLE essay_activities ADD COLUMN program_id uuid[];
    END IF;

    -- 3. Convert block_id to uuid array
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'block_id') THEN
        IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'block_id') != 'ARRAY' THEN
            ALTER TABLE essay_activities ALTER COLUMN block_id TYPE uuid[] USING ARRAY[block_id]::uuid[];
        END IF;
    ELSE
        ALTER TABLE essay_activities ADD COLUMN block_id uuid[];
    END IF;
END $$;

COMMENT ON COLUMN essay_activities.course_id IS 'Array of course IDs this activity is assigned to';
COMMENT ON COLUMN essay_activities.program_id IS 'Array of program IDs this activity belongs to';
COMMENT ON COLUMN essay_activities.block_id IS 'Array of block (section) IDs this activity is assigned to';
