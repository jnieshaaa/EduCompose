-- 28_fix_essay_id_types.sql
-- Comprehensive migration for Essays module to standardized UUID primary and foreign keys.
-- Fixed: Added essay_comparisons to DROP DEFAULT to resolve casting error.

BEGIN;

-- 1. DROP ALL FOREIGN KEY CONSTRAINTS
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_activity_id_fkey;
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_student_id_fkey;

ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_essay_id_fkey;
ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_activity_id_fkey;
ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_student_id_fkey;

ALTER TABLE essay_comparisons DROP CONSTRAINT IF EXISTS essay_comparisons_activity_id_fkey;

-- 2. DROP ALL PRIMARY KEY CONSTRAINTS
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_pkey CASCADE;
ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS essay_activities_pkey CASCADE;
ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_pkey CASCADE;
ALTER TABLE essay_comparisons DROP CONSTRAINT IF EXISTS essay_comparisons_pkey CASCADE;

-- 3. DROP ALL RLS POLICIES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('essay_activities', 'essays', 'essay_analysis_results', 'essay_comparisons')
    ) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 4. HELPER FUNCTIONS FOR ROBUST CASTING
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

CREATE OR REPLACE FUNCTION migrate_array_to_uuid(vals text[]) RETURNS uuid[] AS $$
DECLARE
    result uuid[] := '{}';
    v text;
BEGIN
    IF vals IS NULL THEN RETURN NULL; END IF;
    FOREACH v IN ARRAY vals LOOP
        result := result || migrate_to_uuid(v);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. DROP DEFAULT VALUES (FULLY COMPREHENSIVE)
ALTER TABLE essay_activities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE essays ALTER COLUMN id DROP DEFAULT;
ALTER TABLE essays ALTER COLUMN activity_id DROP DEFAULT;
ALTER TABLE essay_analysis_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE essay_comparisons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE essay_comparisons ALTER COLUMN activity_id DROP DEFAULT;

-- 6. CONVERT TABLES
-- essay_activities
ALTER TABLE essay_activities 
  ALTER COLUMN id TYPE uuid USING migrate_to_uuid(id::text);
ALTER TABLE essay_activities ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- essays
ALTER TABLE essays 
  ALTER COLUMN id TYPE uuid USING migrate_to_uuid(id::text),
  ALTER COLUMN activity_id TYPE uuid USING migrate_to_uuid(activity_id::text),
  ALTER COLUMN student_id TYPE uuid USING migrate_to_uuid(student_id::text); 
ALTER TABLE essays ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- essay_analysis_results
ALTER TABLE essay_analysis_results 
  ALTER COLUMN id TYPE uuid USING migrate_to_uuid(id::text),
  ALTER COLUMN essay_id TYPE uuid USING migrate_to_uuid(essay_id::text),
  ALTER COLUMN activity_id TYPE uuid USING migrate_to_uuid(activity_id::text),
  ALTER COLUMN student_id TYPE uuid USING migrate_to_uuid(student_id::text);
ALTER TABLE essay_analysis_results ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- essay_comparisons
ALTER TABLE essay_comparisons 
  ALTER COLUMN id TYPE uuid USING migrate_to_uuid(id::text),
  ALTER COLUMN activity_id TYPE uuid USING migrate_to_uuid(activity_id::text);
-- Handle arrays
ALTER TABLE essay_comparisons 
  ALTER COLUMN student_ids TYPE uuid[] USING migrate_array_to_uuid(student_ids::text[]),
  ALTER COLUMN essay_ids TYPE uuid[] USING migrate_array_to_uuid(essay_ids::text[]);
ALTER TABLE essay_comparisons ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 7. RESTORE PRIMARY KEYS
ALTER TABLE essay_activities ADD CONSTRAINT essay_activities_pkey PRIMARY KEY (id);
ALTER TABLE essays ADD CONSTRAINT essays_pkey PRIMARY KEY (id);
ALTER TABLE essay_analysis_results ADD CONSTRAINT essay_analysis_results_pkey PRIMARY KEY (id);
ALTER TABLE essay_comparisons ADD CONSTRAINT essay_comparisons_pkey PRIMARY KEY (id);

-- 8. RESTORE FOREIGN KEYS
ALTER TABLE essays 
  ADD CONSTRAINT essays_activity_id_fkey 
  FOREIGN KEY (activity_id) REFERENCES essay_activities(id) ON DELETE SET NULL;

ALTER TABLE essays 
  ADD CONSTRAINT essays_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_essay_id_fkey 
  FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE CASCADE;

ALTER TABLE essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_activity_id_fkey 
  FOREIGN KEY (activity_id) REFERENCES essay_activities(id) ON DELETE SET NULL;

ALTER TABLE essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE essay_comparisons 
  ADD CONSTRAINT essay_comparisons_activity_id_fkey 
  FOREIGN KEY (activity_id) REFERENCES essay_activities(id) ON DELETE CASCADE;

-- 9. RESTORE BASELINE RLS POLICIES
CREATE POLICY "Teachers can manage their activities" ON essay_activities FOR ALL TO authenticated USING (teacher_id = auth.uid() OR is_admin());
CREATE POLICY "Students can view assigned activities" ON essay_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can manage their own essays" ON essays FOR ALL TO authenticated USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));
CREATE POLICY "Teachers can manage essays of their students" ON essays FOR ALL TO authenticated USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()) OR is_admin());
CREATE POLICY "Teachers can manage analysis results" ON essay_analysis_results FOR ALL TO authenticated USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()) OR is_admin());
CREATE POLICY "Students can view their own analysis results" ON essay_analysis_results FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

-- 10. CLEANUP HELPER FUNCTIONS
DROP FUNCTION migrate_array_to_uuid(text[]);
DROP FUNCTION migrate_to_uuid(text);

COMMIT;
