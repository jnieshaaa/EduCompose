--------------------------------------------------------------------------------
-- Check which programs belong to which teacher
-- Run this to see the current state before/after migration
--------------------------------------------------------------------------------

-- Check programs and their creators
SELECT 
  p.id,
  p.name,
  p.created_by,
  t.email as creator_email,
  t.full_name as creator_name,
  p.created_at
FROM programs p
LEFT JOIN teachers t ON p.created_by = t.id
ORDER BY p.id;

-- Check sections and their creators
SELECT 
  s.id,
  s.name,
  s.program_id,
  p.name as program_name,
  s.created_by,
  t.email as creator_email,
  t.full_name as creator_name,
  s.created_at
FROM sections s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN teachers t ON s.created_by = t.id
ORDER BY s.id;

-- Count programs by creator
SELECT 
  COALESCE(t.full_name, 'No Creator (NULL)') as creator,
  COUNT(*) as program_count
FROM programs p
LEFT JOIN teachers t ON p.created_by = t.id
GROUP BY t.full_name
ORDER BY program_count DESC;

-- Count sections by creator
SELECT 
  COALESCE(t.full_name, 'No Creator (NULL)') as creator,
  COUNT(*) as section_count
FROM sections s
LEFT JOIN teachers t ON s.created_by = t.id
GROUP BY t.full_name
ORDER BY section_count DESC;

-- List all teachers
SELECT id, email, full_name, auth_user_id
FROM teachers
ORDER BY id;
