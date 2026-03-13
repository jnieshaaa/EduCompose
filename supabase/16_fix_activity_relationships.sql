--------------------------------------------------------------------------------
-- Migration: Fix Activity and Essay Relationships for Teacher Side Redesign (Revision 3)
--------------------------------------------------------------------------------

-- 1. DROP EXISTING POLICIES FIRST
DROP POLICY IF EXISTS "Users can view their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Users can create activities" ON essay_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can view their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can create activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can update their own activities" ON essay_activities;
DROP POLICY IF EXISTS "Teachers can delete their own activities" ON essay_activities;

DROP POLICY IF EXISTS "Users can view their own essays" ON essays;
DROP POLICY IF EXISTS "Users can create essays" ON essays;
DROP POLICY IF EXISTS "Users can update their own essays" ON essays;
DROP POLICY IF EXISTS "Users can delete their own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can view their own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can create essays" ON essays;
DROP POLICY IF EXISTS "Teachers can update their own essays" ON essays;
DROP POLICY IF EXISTS "Teachers can delete their own essays" ON essays;

DO $$ 
BEGIN
    -- 2. DROP EXISTING CONSTRAINTS
    -- We'll try to drop common constraint names that might exist
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_user_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_section_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_teacher_id_fkey;
    ALTER TABLE IF EXISTS essay_activities DROP CONSTRAINT IF EXISTS essay_activities_block_id_fkey;

    ALTER TABLE IF EXISTS essays DROP CONSTRAINT IF EXISTS essays_user_id_fkey;
    ALTER TABLE IF EXISTS essays DROP CONSTRAINT IF EXISTS essays_section_id_fkey;
    ALTER TABLE IF EXISTS essays DROP CONSTRAINT IF EXISTS essays_teacher_id_fkey;
    ALTER TABLE IF EXISTS essays DROP CONSTRAINT IF EXISTS essays_block_id_fkey;

    -- 3. Update essay_activities table
    -- Rename section_id to block_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'section_id') THEN
        ALTER TABLE essay_activities RENAME COLUMN section_id TO block_id;
    END IF;

    -- Rename user_id to teacher_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'user_id') THEN
        ALTER TABLE essay_activities RENAME COLUMN user_id TO teacher_id;
    END IF;

    -- Now alter columns only if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'block_id') THEN
        ALTER TABLE essay_activities ALTER COLUMN block_id TYPE uuid USING NULL;
        ALTER TABLE essay_activities ALTER COLUMN block_id SET DEFAULT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'teacher_id') THEN
        ALTER TABLE essay_activities ALTER COLUMN teacher_id TYPE uuid USING NULL;
        ALTER TABLE essay_activities ALTER COLUMN teacher_id SET DEFAULT NULL;
    END IF;

    -- 4. Update essays table
    -- Rename section_id to block_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'section_id') THEN
        ALTER TABLE essays RENAME COLUMN section_id TO block_id;
    END IF;

    -- Rename user_id to teacher_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'user_id') THEN
        ALTER TABLE essays RENAME COLUMN user_id TO teacher_id;
    END IF;

    -- Now alter columns only if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'block_id') THEN
        ALTER TABLE essays ALTER COLUMN block_id TYPE uuid USING NULL;
        ALTER TABLE essays ALTER COLUMN block_id SET DEFAULT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'teacher_id') THEN
        ALTER TABLE essays ALTER COLUMN teacher_id TYPE uuid USING NULL;
        ALTER TABLE essays ALTER COLUMN teacher_id SET DEFAULT NULL;
    END IF;

    -- 5. RE-ADD CONSTRAINTS ONLY IF COLUMNS EXIST
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'teacher_id') THEN
        ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(auth_user_id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'block_id') THEN
        ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_block_id_fkey FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'teacher_id') THEN
        ALTER TABLE essays ADD CONSTRAINT essays_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(auth_user_id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'block_id') THEN
        ALTER TABLE essays ADD CONSTRAINT essays_block_id_fkey FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL;
    END IF;

END $$;

-- 6. RECREATE POLICIES (Only if columns exist)
-- essay_activities
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'teacher_id') THEN
        EXECUTE 'CREATE POLICY "Teachers can view their own activities" ON essay_activities FOR SELECT TO authenticated USING (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can create activities" ON essay_activities FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can update their own activities" ON essay_activities FOR UPDATE TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can delete their own activities" ON essay_activities FOR DELETE TO authenticated USING (teacher_id = auth.uid())';
    END IF;
END $$;

-- essays
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'teacher_id') THEN
        EXECUTE 'CREATE POLICY "Teachers can view their own essays" ON essays FOR SELECT TO authenticated USING (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can create essays" ON essays FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can update their own essays" ON essays FOR UPDATE TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Teachers can delete their own essays" ON essays FOR DELETE TO authenticated USING (teacher_id = auth.uid())';
    END IF;
END $$;
