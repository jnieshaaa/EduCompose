--------------------------------------------------------------------------------
-- Helper script to assign existing programs and sections to a specific teacher
-- Run this AFTER add_creator_to_programs_sections.sql if you need to assign
-- existing records to a teacher (e.g., Junie Antopina)
--
-- IMPORTANT: Modify the email address below to match the teacher who should own
-- the existing programs and sections
--------------------------------------------------------------------------------

-- Find teacher ID by email (modify the email as needed)
-- Example: Assign all NULL programs to Junie Antopina
UPDATE programs 
SET created_by = (
  SELECT id FROM teachers 
  WHERE email = 'junie.antopina@example.com' 
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Assign all NULL sections to the same teacher
UPDATE sections 
SET created_by = (
  SELECT id FROM teachers 
  WHERE email = 'junie.antopina@example.com' 
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Verify the assignment
SELECT 
  p.id, 
  p.name, 
  p.created_by, 
  t.email, 
  t.full_name 
FROM programs p
LEFT JOIN teachers t ON p.created_by = t.id
ORDER BY p.id;

SELECT 
  s.id, 
  s.name, 
  s.created_by, 
  t.email, 
  t.full_name 
FROM sections s
LEFT JOIN teachers t ON s.created_by = t.id
ORDER BY s.id;
