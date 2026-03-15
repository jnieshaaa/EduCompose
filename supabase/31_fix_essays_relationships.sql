--------------------------------------------------------------------------------
-- Migration: Fix Essay Relationships for Nested Queries
--------------------------------------------------------------------------------

DO $$ 
BEGIN
    -- 1. Add block_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'block_id') THEN
        ALTER TABLE essays ADD COLUMN block_id uuid;
    END IF;

    -- 2. Create missing foreign key relationships
    
    -- Relationship between essays and blocks
    -- This enables essays!inner(blocks!inner(...)) type queries
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_essays_block') THEN
        ALTER TABLE essays 
        ADD CONSTRAINT fk_essays_block 
        FOREIGN KEY (block_id) 
        REFERENCES blocks(id) 
        ON DELETE SET NULL;
    END IF;

    -- Relationship between essays and students
    -- Ensure student_id (bigint) correctly maps to students.id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_essays_student') THEN
        ALTER TABLE essays 
        ADD CONSTRAINT fk_essays_student 
        FOREIGN KEY (student_id) 
        REFERENCES students(id) 
        ON DELETE CASCADE;
    END IF;

    -- 3. Refresh PostgREST schema cache
    EXECUTE 'NOTIFY pgrst, ''reload schema''';

END $$;
