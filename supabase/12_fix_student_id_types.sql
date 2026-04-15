--------------------------------------------------------------------------------
-- 12_fix_student_id_types.sql
-- Migrates student_id columns from int8 to uuid in block_students, essays,
-- and essay_analysis_results to match the students.id type.
--------------------------------------------------------------------------------

BEGIN;

-- 1. DROP CONSTRAINTS AND INDEXES
-- block_students
ALTER TABLE block_students DROP CONSTRAINT IF EXISTS block_students_pkey;
ALTER TABLE block_students DROP CONSTRAINT IF EXISTS block_students_student_id_fkey;
DROP INDEX IF EXISTS bs_student_id_idx;

-- essays
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_student_id_fkey;
DROP INDEX IF EXISTS essays_student_id_idx;

-- essay_analysis_results
ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS essay_analysis_results_student_id_fkey;
DROP INDEX IF EXISTS ear_student_id_idx;


-- 2. ALTER COLUMN TYPES
-- NOTE: If you have existing data where student_id is an integer (e.g. 1, 2, 3) 
-- and you want to preserve the relationship, you must have a way to map the 
-- old IDs to the new UUIDs. 
-- If you just want to fix the schema and are okay with clearing the data 
-- or if the conversion is straightforward, use the cast.

-- If you get an error "invalid input syntax for type uuid" here, 
-- it means you have existing data that isn't a valid UUID.
-- In that case, you might need to use: USING NULL 
-- (which clears the column) to proceed with the type change.

ALTER TABLE block_students 
  ALTER COLUMN student_id TYPE uuid USING (student_id::text::uuid);

ALTER TABLE essays 
  ALTER COLUMN student_id TYPE uuid USING (student_id::text::uuid);

ALTER TABLE essay_analysis_results 
  ALTER COLUMN student_id TYPE uuid USING (student_id::text::uuid);


-- 3. RESTORE PRIMARY KEY (block_students)
ALTER TABLE block_students ADD CONSTRAINT block_students_pkey PRIMARY KEY (block_id, student_id);


-- 4. RESTORE FOREIGN KEY CONSTRAINTS
ALTER TABLE block_students 
  ADD CONSTRAINT block_students_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE essays 
  ADD CONSTRAINT essays_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE essay_analysis_results 
  ADD CONSTRAINT essay_analysis_results_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;


-- 5. RESTORE INDEXES
CREATE INDEX IF NOT EXISTS bs_student_id_idx ON block_students(student_id);
CREATE INDEX IF NOT EXISTS essays_student_id_idx ON essays(student_id);
CREATE INDEX IF NOT EXISTS ear_student_id_idx ON essay_analysis_results(student_id);

COMMIT;
