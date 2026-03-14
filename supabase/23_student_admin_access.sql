--------------------------------------------------------------------------------
-- Migration: Admin Access for Students and Enrollment Status Fix
-- 1. Ensure enrollment_status column exists with proper type
-- 2. Add Admin RLS Policy for students table
--------------------------------------------------------------------------------

-- 1. ENROLLMENT STATUS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
        CREATE TYPE student_status AS ENUM ('active', 'dropped', 'graduated');
    END IF;
END $$;

ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_status student_status NOT NULL DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. ADMIN POLICIES
-- Function is_admin should already exist from 03_add_admin_policies.sql
-- but let's make sure we have a policy for admins on students
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
CREATE POLICY "Admins can manage all students"
ON students FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure teachers also have their policy (should exist but to be safe)
-- Migration 15 added "Teachers can manage their own students"
-- If we want both to exist, Postgres will OR them.

-- 3. REFRESH SCHEMA CACHE HINT
-- Sometimes Supabase 400 errors are due to stale schema cache.
-- Running any DDL (like what we just did) usually triggers a refresh.
