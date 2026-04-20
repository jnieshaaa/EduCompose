-- Allow students to view their own analysis results
-- This fixes the issue where students see 0% or no results for plagiarism/AI detection
-- because they were blocked by RLS policies.

-- Drop the existing "Teachers can manage analysis results" policy if it exists to clean up
-- though typically we just ADD a new one or UPDATE it.
-- Let's just add the student policy.

CREATE POLICY "Students can view their own analysis results"
  ON essay_analysis_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = auth.uid()
    )
  );

-- Update the teacher policy to be more explicit if needed, 
-- but the original one was probably fine for teachers.
-- Actually, let's make sure it covers all cases 
-- (teachers can manage, students can only select their own).

-- If the existing policy was "Teachers can manage analysis results", 
-- it was FOR ALL, which is fine.
