-- 09_ESSAYS_SCHEMA_FIX.SQL
-- Purpose: Restore missing score and metadata columns to the essays table
-- Author: Antigravity

BEGIN;

-- 1. Add missing columns to 'essays' table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='overall_score') THEN
        ALTER TABLE essays ADD COLUMN overall_score numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='coherence_score') THEN
        ALTER TABLE essays ADD COLUMN coherence_score numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='readability_score') THEN
        ALTER TABLE essays ADD COLUMN readability_score numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='argument_strength_score') THEN
        ALTER TABLE essays ADD COLUMN argument_strength_score numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='grammar_score') THEN
        ALTER TABLE essays ADD COLUMN grammar_score numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='word_count') THEN
        ALTER TABLE essays ADD COLUMN word_count integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='grading_error') THEN
        ALTER TABLE essays ADD COLUMN grading_error text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='file_path') THEN
        ALTER TABLE essays ADD COLUMN file_path text;
    END IF;

    -- Optional: Add title if it's also missing (some parts of code use it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='title') THEN
        ALTER TABLE essays ADD COLUMN title text;
    END IF;

    -- Ensure block_id exists (for section filtering)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='block_id') THEN
        ALTER TABLE essays ADD COLUMN block_id uuid REFERENCES public.blocks(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
