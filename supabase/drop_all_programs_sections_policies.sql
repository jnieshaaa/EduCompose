--------------------------------------------------------------------------------
-- Helper script to drop ALL policies on programs and sections tables
-- Run this if you need to completely reset policies before running migrations
--------------------------------------------------------------------------------

-- Drop all policies on programs table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'programs' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON programs', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Drop all policies on sections table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'sections' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sections', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Verify all policies are dropped
SELECT 'programs' as table_name, policyname 
FROM pg_policies 
WHERE tablename = 'programs' AND schemaname = 'public'
UNION ALL
SELECT 'sections' as table_name, policyname 
FROM pg_policies 
WHERE tablename = 'sections' AND schemaname = 'public';
