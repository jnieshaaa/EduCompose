-- Fix 1: Add foreign key relationship from essay_analysis_results to essays
ALTER TABLE IF EXISTS essay_analysis_results
  DROP CONSTRAINT IF EXISTS fk_analysis_essay, -- Drop if the previous generic name exists
  DROP CONSTRAINT IF EXISTS essays_id_fkey,
  ADD CONSTRAINT essays_id_fkey
  FOREIGN KEY (essay_id)
  REFERENCES essays(id)
  ON DELETE CASCADE;

-- Fix 2: Add foreign key relationship from essays to students
ALTER TABLE IF EXISTS essays
  DROP CONSTRAINT IF EXISTS fk_essay_student, -- Drop if the previous generic name exists
  DROP CONSTRAINT IF EXISTS essays_student_id_fkey,
  ADD CONSTRAINT essays_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE CASCADE;

-- Fix 3: Add foreign key relationship from essays to blocks
ALTER TABLE IF EXISTS essays
  DROP CONSTRAINT IF EXISTS fk_essay_block, -- Drop if the previous generic name exists
  DROP CONSTRAINT IF EXISTS essays_block_id_fkey,
  ADD CONSTRAINT essays_block_id_fkey
  FOREIGN KEY (block_id)
  REFERENCES blocks(id)
  ON DELETE CASCADE;

-- Fix 4: Add foreign key relationship from blocks to teacher_program_loads
ALTER TABLE IF EXISTS blocks
  DROP CONSTRAINT IF EXISTS fk_block_program_load,
  ADD CONSTRAINT fk_block_program_load
  FOREIGN KEY (program_load_id)
  REFERENCES teacher_program_loads(id)
  ON DELETE CASCADE;

-- Force Supabase/PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
