-- Fix 1: Add foreign key relationship from essay_analysis_results to essays
ALTER TABLE IF EXISTS essay_analysis_results
  DROP CONSTRAINT IF EXISTS fk_analysis_essay, -- Drop if it exists to avoid errors
  ADD CONSTRAINT fk_analysis_essay
  FOREIGN KEY (essay_id)
  REFERENCES essays(id)
  ON DELETE CASCADE;

-- Fix 2: Add foreign key relationship from essays to blocks
ALTER TABLE IF EXISTS essays
  DROP CONSTRAINT IF EXISTS fk_essay_block,
  ADD CONSTRAINT fk_essay_block
  FOREIGN KEY (block_id)
  REFERENCES blocks(id)
  ON DELETE CASCADE;

-- Fix 3: Add foreign key relationship from essays to students
ALTER TABLE IF EXISTS essays
  DROP CONSTRAINT IF EXISTS fk_essay_student,
  ADD CONSTRAINT fk_essay_student
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE CASCADE;

-- After running this, if queries still fail, you might need to run this command
-- to force Supabase/PostgREST to refresh its schema cache:
NOTIFY pgrst, 'reload schema';
