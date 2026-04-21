-- 31_repair_essays_schema_v4.sql
-- NUCLEAR REPAIR for essay_analysis_results
-- This script FORCES column types to UUID regardless of policies or constraints.

BEGIN;

-- 1. Ensure essays table has the required analysis columns (Safe)
ALTER TABLE public.essays 
  ADD COLUMN IF NOT EXISTS analysis JSONB,
  ADD COLUMN IF NOT EXISTS grammar_score NUMERIC,
  ADD COLUMN IF NOT EXISTS readability_score NUMERIC,
  ADD COLUMN IF NOT EXISTS coherence_score NUMERIC,
  ADD COLUMN IF NOT EXISTS argument_strength_score NUMERIC,
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC,
  ADD COLUMN IF NOT EXISTS grammar_errors JSONB,
  ADD COLUMN IF NOT EXISTS style_issues JSONB,
  ADD COLUMN IF NOT EXISTS argument_analysis JSONB,
  ADD COLUMN IF NOT EXISTS word_count INTEGER,
  ADD COLUMN IF NOT EXISTS grading_error TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 2. DROP ALL POLICIES on essay_analysis_results (Nuclear)
-- We list all known and potential policy names to be safe
DROP POLICY IF EXISTS "Students can update their own analysis results" ON public.essay_analysis_results;
DROP POLICY IF EXISTS "Students can view their own analysis results" ON public.essay_analysis_results;
DROP POLICY IF EXISTS "Teachers can manage analysis results" ON public.essay_analysis_results;
DROP POLICY IF EXISTS "Only teachers can manage analysis results" ON public.essay_analysis_results;
DROP POLICY IF EXISTS "Students can manage their own results" ON public.essay_analysis_results;

-- 3. DROP ALL CONSTRAINTS referencing the IDs
ALTER TABLE public.essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_essay_id_fkey;
ALTER TABLE public.essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_student_id_fkey;
ALTER TABLE public.essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_activity_id_fkey;
ALTER TABLE public.essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_pkey;

-- 4. CONVERT TYPES with explicit casting
-- We create the helper again just in case
CREATE OR REPLACE FUNCTION migrate_to_uuid_v3(val text) RETURNS uuid AS $$
BEGIN
    IF val IS NULL OR val = '' THEN RETURN NULL; END IF;
    IF val ~ '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$' THEN
        RETURN val::uuid;
    END IF;
    IF val ~ '^[0-9]+$' THEN
        RETURN lpad(to_hex(val::bigint), 32, '0')::uuid;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Perform the type change
ALTER TABLE public.essay_analysis_results 
  ALTER COLUMN id TYPE uuid USING migrate_to_uuid_v3(id::text),
  ALTER COLUMN essay_id TYPE uuid USING migrate_to_uuid_v3(essay_id::text),
  ALTER COLUMN student_id TYPE uuid USING migrate_to_uuid_v3(student_id::text),
  ALTER COLUMN activity_id TYPE uuid USING migrate_to_uuid_v3(activity_id::text);

-- 5. RESTORE DEFAULTS AND PKEY
ALTER TABLE public.essay_analysis_results 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD PRIMARY KEY (id);

-- 6. RESTORE FOREIGN KEYS (Assume essays.id and students.id are already UUIDs)
ALTER TABLE public.essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_essay_id_fkey 
  FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE CASCADE;

ALTER TABLE public.essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 7. RESTORE POLICIES
CREATE POLICY "Students can update their own analysis results"
  ON essay_analysis_results FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Students can view their own analysis results"
  ON essay_analysis_results FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "Teachers can manage analysis results"
  ON essay_analysis_results FOR ALL TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()) OR is_admin());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
