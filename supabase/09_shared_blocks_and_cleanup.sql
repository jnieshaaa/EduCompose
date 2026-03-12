--------------------------------------------------------------------------------
-- Migration: Shared Block System and Legacy Cleanup
-- 1. Create blocks and related tables
-- 2. Clean up legacy 'programs' and 'teachers' references
-- 3. Update students and courses to use programs_lookup and users table
--------------------------------------------------------------------------------

-- 1. SHARED BLOCK SYSTEM TABLES
-- Create blocks table (Shared across teachers)
CREATE TABLE IF NOT EXISTS blocks (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id    uuid REFERENCES programs_lookup(id) ON DELETE CASCADE,
    year_level    integer NOT NULL,
    name          text NOT NULL, -- Section name like 'A', 'B'
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE(program_id, year_level, name)
);

-- Add block_id to teacher_course_loads to link assignments directly
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_course_loads') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_course_loads' AND column_name = 'block_id') THEN
            ALTER TABLE teacher_course_loads ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create block_students table (Links students to blocks)
CREATE TABLE IF NOT EXISTS block_students (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id    uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    student_id  bigint NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(block_id, student_id)
);

-- 2. LEGACY CLEANUP & SCHEMA UPDATES
-- Update students table: Replace programs(id) with programs_lookup(id)
DO $$ 
BEGIN 
    -- Drop old foreign key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_program_id_fkey') THEN
        ALTER TABLE students DROP CONSTRAINT students_program_id_fkey;
    END IF;

    -- Change column type from bigint to uuid
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'program_id' AND data_type = 'bigint') THEN
        ALTER TABLE students ALTER COLUMN program_id TYPE uuid USING NULL;
    END IF;

    -- Add new foreign key to programs_lookup
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_program_id_lookup_fkey') THEN
        ALTER TABLE students ADD CONSTRAINT students_program_id_lookup_fkey FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update rubrics and essays: Replace users(id) with users(auth_user_id)
-- (Renaming logic handled in final_cleanup migration)

-- 3. ENABLE RLS & POLICIES
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_students ENABLE ROW LEVEL SECURITY;

-- Blocks Policies
DROP POLICY IF EXISTS "Allow select for authenticated users" ON blocks;
CREATE POLICY "Allow select for authenticated users" ON blocks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON blocks;
CREATE POLICY "Allow all for authenticated users" ON blocks FOR ALL TO authenticated USING (true);

-- Block Students Policies
DROP POLICY IF EXISTS "Allow select for authenticated users" ON block_students;
CREATE POLICY "Allow select for authenticated users" ON block_students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON block_students;
CREATE POLICY "Allow all for authenticated users" ON block_students FOR ALL TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS blocks_program_id_idx ON blocks(program_id);
CREATE INDEX IF NOT EXISTS teacher_course_loads_block_id_idx ON teacher_course_loads(block_id);

-- Grant Permissions
GRANT ALL ON blocks TO authenticated;
GRANT ALL ON block_students TO authenticated;

