-- Migration: Final Student-to-Block Synchronization Fix
-- This script ensures all students in student_profiles are correctly linked to their respective classes.

BEGIN;

-- 1. Update the core enrollment RPC to include auto-linking for all future admin actions
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v1(
  p_email        text,
  p_student_code text,
  p_first_name   text,
  p_last_name    text,
  p_middle_name  text DEFAULT NULL,
  p_suffix       text DEFAULT NULL,
  p_birthday     text DEFAULT NULL,
  p_program_id   uuid DEFAULT NULL,
  p_year         integer DEFAULT 1,
  p_block_name   text DEFAULT NULL,
  p_teacher_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find or create user ID
  SELECT id INTO v_user_id FROM public.users 
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Try to find by student_code in profiles
    SELECT user_id INTO v_user_id FROM public.student_profiles
    WHERE student_code = p_student_code
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- Sync to shared users table
  INSERT INTO public.users (
    id, email, first_name, last_name, middle_name, suffix, 
    birthday, role
  ) VALUES (
    v_user_id, lower(trim(p_email)), p_first_name, p_last_name, p_middle_name, p_suffix,
    p_birthday, 'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    birthday = EXCLUDED.birthday;

  -- Sync to student_profiles
  INSERT INTO public.student_profiles (
    user_id, student_code, program_id, year, block_name, teacher_id
  ) VALUES (
    v_user_id, p_student_code, p_program_id, p_year, p_block_name, p_teacher_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    student_code = EXCLUDED.student_code,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name,
    teacher_id = EXCLUDED.teacher_id;

  -- CRITICAL FIX: Link to all matching blocks in block_students
  INSERT INTO public.block_students (block_id, student_id)
  SELECT b.id, v_user_id
  FROM public.blocks b
  JOIN public.teacher_program_loads tpl ON b.program_load_id = tpl.id
  WHERE tpl.program_id = p_program_id
    AND b.year = p_year
    AND b.name = UPPER(TRIM(p_block_name))
  ON CONFLICT DO NOTHING;

  RETURN v_user_id;
END;
$$;

-- 2. Global Sync: Link all existing orphaned students to their blocks
-- This fixes blocks like "1B" that are currently empty despite having students registered.
INSERT INTO public.block_students (block_id, student_id)
SELECT b.id, sp.user_id
FROM public.student_profiles sp
JOIN public.blocks b ON b.year = sp.year AND b.name = UPPER(TRIM(sp.block_name))
JOIN public.teacher_program_loads tpl ON b.program_load_id = tpl.id AND tpl.program_id = sp.program_id
ON CONFLICT DO NOTHING;

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
