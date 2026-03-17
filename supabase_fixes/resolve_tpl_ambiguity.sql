-- Migration: Resolve PostgREST Ambiguity for blocks -> teacher_program_loads
-- This fix removes duplicate foreign key constraints that cause the PGRST201 error.

DO $$ 
BEGIN
    -- 1. Drop the implicit constraint if it exists (standard PG naming)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blocks_program_load_id_fkey' AND table_name = 'blocks') THEN
        ALTER TABLE blocks DROP CONSTRAINT blocks_program_load_id_fkey;
    END IF;

    -- 2. Re-establish the named constraint to ensure consistency
    -- Drop it first to be safe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_block_program_load' AND table_name = 'blocks') THEN
        ALTER TABLE blocks DROP CONSTRAINT fk_block_program_load;
    END IF;

    ALTER TABLE blocks
      ADD CONSTRAINT fk_block_program_load
      FOREIGN KEY (program_load_id)
      REFERENCES teacher_program_loads(id)
      ON DELETE CASCADE;

END $$;

-- 3. Notify PostgREST to refresh its schema cache immediately
NOTIFY pgrst, 'reload schema';
