-- Migration: Comprehensive Student Data Recovery and Sync
-- 1. Fix missing student_profiles for existing students
-- 2. Improved auto-linking logic for block_students
-- 3. Cleanup orphaned block_students entries

BEGIN;

-- 1. Create missing student_profiles for any user with role 'student'
INSERT INTO public.student_profiles (user_id, student_code, onboarding_completed)
SELECT u.id, 'TEMP-' || substr(u.id::text, 1, 8), false
FROM public.users u
LEFT JOIN public.student_profiles sp ON u.id = sp.user_id
WHERE u.role = 'student' AND sp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Improved Sync logic: Link students to blocks more intelligently
-- Handles both "A" and "1A" style block names
INSERT INTO public.block_students (block_id, student_id)
SELECT b.id, sp.user_id
FROM public.student_profiles sp
JOIN public.blocks b ON (
    -- Direct match
    (UPPER(TRIM(b.name)) = UPPER(TRIM(sp.block_name)))
    OR 
    -- Match "1A" to year=1, name="A"
    (UPPER(TRIM(b.name)) = SUBSTRING(UPPER(TRIM(sp.block_name)) FROM '([A-Z]+)$') AND b.year::text = SUBSTRING(UPPER(TRIM(sp.block_name)) FROM '^([0-9]+)'))
    OR
    -- Match "A" to year=1, name="A" if profile year matches block year
    (UPPER(TRIM(b.name)) = UPPER(TRIM(sp.block_name)) AND b.year = sp.year)
)
JOIN public.teacher_program_loads tpl ON b.program_load_id = tpl.id AND tpl.program_id = sp.program_id
ON CONFLICT DO NOTHING;

-- 3. Ensure all student_profiles have a teacher_id if they belong to a block
UPDATE public.student_profiles sp
SET teacher_id = b.teacher_id
FROM public.block_students bs
JOIN public.blocks b ON bs.block_id = b.id
WHERE bs.student_id = sp.user_id
  AND sp.teacher_id IS NULL;

-- 4. Fix the admin_enroll_student_v1 function (Corrected and Finalized)
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
  v_clean_block text;
BEGIN
  v_clean_block := UPPER(TRIM(p_block_name));

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

  -- Link to matching blocks
  INSERT INTO public.block_students (block_id, student_id)
  SELECT b.id, v_user_id
  FROM public.blocks b
  JOIN public.teacher_program_loads tpl ON b.program_load_id = tpl.id
  WHERE tpl.program_id = p_program_id
    AND (
      (UPPER(TRIM(b.name)) = v_clean_block AND b.year = p_year)
      OR
      (v_clean_block = b.year::text || UPPER(TRIM(b.name)))
      OR
      (UPPER(TRIM(b.name)) = SUBSTRING(v_clean_block FROM '([A-Z]+)$') AND b.year::text = SUBSTRING(v_clean_block FROM '^([0-9]+)'))
    )
  ON CONFLICT DO NOTHING;

  RETURN v_user_id;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
