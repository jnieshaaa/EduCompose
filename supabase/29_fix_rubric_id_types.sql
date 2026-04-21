-- 29_fix_rubric_id_types.sql
-- Finalizes the UUID migration by standardizing the rubrics table.

BEGIN;

-- 1. DROP ALL DEPENDENT CONSTRAINTS & POLICIES
-- essay_activities -> rubrics
ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS essay_activities_rubric_id_fkey;
-- essays -> rubrics (if any)
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_rubric_id_fkey;

-- Drop RLS policies on rubrics
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rubrics'
    ) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON rubrics';
    END LOOP;
END $$;

-- 2. HELPER FUNCTIONS FOR ROBUST CASTING
CREATE OR REPLACE FUNCTION migrate_to_uuid(val text) RETURNS uuid AS $$
BEGIN
    IF val IS NULL OR val = '' THEN RETURN NULL; END IF;
    -- Case 1: Already a valid UUID
    IF val ~ '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$' THEN
        RETURN val::uuid;
    END IF;
    -- Case 2: It's an integer ID (like "27")
    IF val ~ '^[0-9]+$' THEN
        RETURN lpad(to_hex(val::bigint), 32, '0')::uuid;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. CONVERT RUBRICS TABLE
-- Drop primary key temporarily
ALTER TABLE rubrics DROP CONSTRAINT IF EXISTS rubrics_pkey CASCADE;

-- Convert ID to UUID
ALTER TABLE rubrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE rubrics ALTER COLUMN id TYPE uuid USING migrate_to_uuid(id::text);
ALTER TABLE rubrics ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Convert teacher_id and user_id (standardize both to UUID referencing users.auth_user_id)
-- Note: Some parts of the app use teacher_id, others use user_id. We'll make both consistent.
ALTER TABLE rubrics ALTER COLUMN teacher_id TYPE uuid USING migrate_to_uuid(teacher_id::text);
ALTER TABLE rubrics ALTER COLUMN user_id TYPE uuid USING migrate_to_uuid(user_id::text);

-- 4. RESTORE CONSTRAINTS
ALTER TABLE rubrics ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);

-- Link essay_activities back to rubrics
ALTER TABLE essay_activities 
    ADD CONSTRAINT essay_activities_rubric_id_fkey 
    FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE SET NULL;

-- 5. RESTORE BASELINE RLS POLICIES
CREATE POLICY "Users can view all rubrics" 
    ON rubrics FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "Users can create rubrics" 
    ON rubrics FOR INSERT TO authenticated 
    WITH CHECK (teacher_id = auth.uid() OR teacher_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update their own rubrics" 
    ON rubrics FOR UPDATE TO authenticated 
    USING (teacher_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can delete their own rubrics" 
    ON rubrics FOR DELETE TO authenticated 
    USING (teacher_id = auth.uid() OR user_id = auth.uid());

-- 6. CLEANUP
DROP FUNCTION IF EXISTS migrate_to_uuid(text);

COMMIT;
