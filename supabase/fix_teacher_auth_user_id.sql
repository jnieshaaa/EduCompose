--------------------------------------------------------------------------------
-- Fix: Update teacher's auth_user_id to match their auth account
-- Run this if the debug script shows a mismatch
--
-- IMPORTANT: Replace the email below with Junie Antopina's actual email
--------------------------------------------------------------------------------

-- First, find the teacher record and their auth user
SELECT 
  t.id as teacher_id,
  t.email as teacher_email,
  t.full_name,
  t.auth_user_id as current_auth_user_id,
  au.id as actual_auth_user_id,
  au.email as auth_email
FROM teachers t
LEFT JOIN auth.users au ON au.email = t.email
WHERE t.email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
LIMIT 1;

-- If the above query shows a mismatch, run this UPDATE:
-- (Uncomment and modify the email addresses as needed)
/*
UPDATE teachers
SET auth_user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
  LIMIT 1
)
WHERE email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
AND (auth_user_id IS NULL OR auth_user_id != (
  SELECT id FROM auth.users 
  WHERE email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
  LIMIT 1
));
*/

-- Verify the fix
SELECT 
  t.id,
  t.email,
  t.full_name,
  t.auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN t.auth_user_id = au.id THEN '✓ Fixed - auth_user_id matches'
    ELSE '✗ Still needs fixing'
  END as status
FROM teachers t
LEFT JOIN auth.users au ON au.id = t.auth_user_id
WHERE t.email = 'junie.antopina@example.com'  -- REPLACE WITH ACTUAL EMAIL
LIMIT 1;
