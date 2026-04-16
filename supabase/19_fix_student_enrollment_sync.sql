-- 19_fix_student_enrollment_sync.sql
-- This script fixes the issue where students are enrolled in the system 
-- but not linked to the teacher's specific blocks (CourseSectionsView showing 0 students).

-- 1. Redefine admin_enroll_student_v3 to include auto-linking to blocks
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v3(
  p_email        text,
  p_password     text,
  p_first_name   text,
  p_last_name    text,
  p_student_code text,
  p_teacher_id   uuid,
  p_program_id   uuid,
  p_year         integer,
  p_block_name   text,
  p_middle_name  text DEFAULT NULL,
  p_birthday     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_student_id  uuid;
  v_block_record RECORD;
BEGIN
  -- A. Upsert student record
  INSERT INTO public.students (
    student_code, first_name, middle_name, last_name, email,
    teacher_id, program_id, year, block_name, birthday,
    onboarding_completed
  ) VALUES (
    p_student_code, p_first_name, p_middle_name, p_last_name, lower(trim(p_email)),
    p_teacher_id, p_program_id, p_year, p_block_name, p_birthday,
    false
  )
  ON CONFLICT (student_code) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    middle_name = EXCLUDED.middle_name,
    email = EXCLUDED.email,
    teacher_id = EXCLUDED.teacher_id,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name,
    birthday = EXCLUDED.birthday
  RETURNING id INTO v_student_id;

  -- B. Auto-enroll student into any EXISTING matching blocks
  -- We look for blocks that match the program, year, and name
  FOR v_block_record IN 
    SELECT b.id 
    FROM public.blocks b
    JOIN public.teacher_program_loads tpl ON b.program_load_id = tpl.id
    WHERE tpl.program_id = p_program_id
      AND b.year = p_year
      AND upper(trim(b.name)) = upper(trim(p_block_name))
  LOOP
    INSERT INTO public.block_students (block_id, student_id)
    VALUES (v_block_record.id, v_student_id)
    ON CONFLICT (block_id, student_id) DO NOTHING;
  END LOOP;

  RETURN v_student_id;
END;
$$;

-- 2. Run a one-time sync for existing students who are not in block_students
-- This will link all students to blocks that match their program, year, and block_name
DO $$
DECLARE
    v_row RECORD;
BEGIN
    FOR v_row IN 
        SELECT s.id as student_id, b.id as block_id
        FROM public.students s
        JOIN public.teacher_program_loads tpl ON s.program_id = tpl.program_id
        JOIN public.blocks b ON b.program_load_id = tpl.id
        WHERE s.year = b.year
          AND upper(trim(s.block_name)) = upper(trim(b.name))
    LOOP
        INSERT INTO public.block_students (block_id, student_id)
        VALUES (v_row.block_id, v_row.student_id)
        ON CONFLICT (block_id, student_id) DO NOTHING;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v3 TO authenticated;

-- Force postgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
