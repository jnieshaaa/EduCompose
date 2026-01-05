--------------------------------------------------------------------------------
-- Helper script to assign existing students to a specific teacher
-- Run this AFTER add_creator_to_students.sql if you need to assign
-- existing records to a teacher (e.g., Junie Antopina)
--
-- IMPORTANT: 
-- 1. First run: supabase/add_creator_to_students.sql
-- 2. Then run this script
-- 3. Modify the email address below to match the teacher who should own
--    the existing students
--------------------------------------------------------------------------------

-- IMPORTANT: This script requires the created_by column to exist!
-- If you get an error about the column not existing, run this first:
-- supabase/add_creator_to_students.sql

-- Find teacher ID by email (modify the email as needed)
-- Example: Assign all NULL students to Junie Antopina
UPDATE students 
SET created_by = (
  SELECT id FROM teachers 
  WHERE email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Verify the assignment
SELECT 
  s.id,
  s.student_code,
  s.full_name,
  s.created_by,
  t.email as creator_email,
  t.full_name as creator_name
FROM students s
LEFT JOIN teachers t ON s.created_by = t.id
ORDER BY s.id;

-- Count students by creator
SELECT 
  COALESCE(t.full_name, 'No Creator (NULL)') as creator,
  COUNT(*) as student_count
FROM students s
LEFT JOIN teachers t ON s.created_by = t.id
GROUP BY t.full_name
ORDER BY student_count DESC;
