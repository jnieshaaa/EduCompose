--------------------------------------------------------------------------------
-- Migration: Refactor Blocks System
-- Purpose: 
-- 1. Restructure 'blocks' to be defined by program, year level, and name
-- 2. Remove redundant academic term/year from 'blocks'
-- 3. Link 'blocks' directly to 'teacher_course_loads'
-- 4. Remove redundant 'teaching_assignments' table
--------------------------------------------------------------------------------

DO $$ 
BEGIN 
    -- 1. CLEAN UP BLOCKS TABLE
    -- Drop old unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocks_name_term_academic_year_key') THEN
        ALTER TABLE blocks DROP CONSTRAINT blocks_name_term_academic_year_key;
    END IF;

    -- Drop redundant columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'term') THEN
        ALTER TABLE blocks DROP COLUMN term;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'academic_year') THEN
        ALTER TABLE blocks DROP COLUMN academic_year;
    END IF;

    -- Add year_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'year_level') THEN
        ALTER TABLE blocks ADD COLUMN year_level integer;
    END IF;

    -- Ensure name is just the section name (e.g., 'A', 'B')
    -- Then add the new unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocks_program_year_name_unique') THEN
        ALTER TABLE blocks ADD CONSTRAINT blocks_program_year_name_unique UNIQUE(program_id, year_level, name);
    END IF;

    -- 2. UPDATE TEACHER_COURSE_LOADS
    -- Add block_id column to link directly
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_course_loads' AND column_name = 'block_id') THEN
        ALTER TABLE teacher_course_loads ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE SET NULL;
    END IF;

    -- 3. DROP REDUNDANT TEACHING_ASSIGNMENTS TABLE
    DROP TABLE IF EXISTS teaching_assignments CASCADE;

END $$;

-- Update RLS and indexes
CREATE INDEX IF NOT EXISTS blocks_program_id_idx ON blocks(program_id);
CREATE INDEX IF NOT EXISTS teacher_course_loads_block_id_idx ON teacher_course_loads(block_id);

COMMENT ON TABLE blocks IS 'Student blocks defined by Program, Year Level, and Section Name (e.g., BSCS 1 A)';
COMMENT ON COLUMN blocks.year_level IS 'The student year level (1-4)';
COMMENT ON COLUMN blocks.name IS 'The section name (e.g., A, B, C)';
COMMENT ON COLUMN teacher_course_loads.block_id IS 'The block assigned to this specific teacher course load';
