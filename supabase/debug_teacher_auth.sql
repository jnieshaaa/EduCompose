--------------------------------------------------------------------------------
-- Debug script: Check teacher authentication and RLS policy issues
-- Run this to diagnose why program creation is failing
--------------------------------------------------------------------------------

-- 1. Check current authenticated user
SELECT 
  'Current Auth User' as check_type,
  auth.uid() as auth_user_id,
  auth.email() as auth_email;

-- 2. Check all teachers and their auth_user_id
SELECT 
  'All Teachers' as check_type,
  id,
  email,
  full_name,
  auth_user_id,
  CASE 
    WHEN auth_user_id = auth.uid() THEN 'MATCHES CURRENT USER'
    ELSE 'Different user'
  END as match_status
FROM teachers
ORDER BY id;

-- 3. Check if current user has a teacher record
SELECT 
  'Current User Teacher Record' as check_type,
  t.id as teacher_id,
  t.email,
  t.full_name,
  t.auth_user_id,
  CASE 
    WHEN t.auth_user_id = auth.uid() THEN '✓ MATCH - Should work'
    WHEN t.auth_user_id IS NULL THEN '✗ NULL auth_user_id - Problem!'
    ELSE '✗ MISMATCH - Problem!'
  END as status
FROM teachers t
WHERE t.auth_user_id = auth.uid()
LIMIT 1;

-- 4. Test the RLS policy check manually
SELECT 
  'RLS Policy Test' as check_type,
  t.id as teacher_id,
  CASE 
    WHEN t.id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid()) 
    THEN '✓ Policy would allow this teacher_id'
    ELSE '✗ Policy would REJECT this teacher_id'
  END as policy_result
FROM teachers t
WHERE t.auth_user_id = auth.uid()
LIMIT 1;

-- 5. Show programs with their creators
SELECT 
  'Programs Ownership' as check_type,
  p.id,
  p.name,
  p.created_by,
  t.email as creator_email,
  t.full_name as creator_name,
  t.auth_user_id as creator_auth_id
FROM programs p
LEFT JOIN teachers t ON p.created_by = t.id
ORDER BY p.id;
