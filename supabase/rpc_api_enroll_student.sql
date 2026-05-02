-- 3. [ENROLLMENT] Admin-to-Student Enrollment
-- High-level function used by the Admin Panel.
-- DEPENDENCY: public.create_new_portal_user_v1

-- Drop the old signature if it exists
DROP FUNCTION IF EXISTS public.api_enroll_student_v1(text, text, text, text, text, uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS public.api_enroll_student_v1(text, text, text, text, text, uuid, uuid, uuid, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.api_enroll_student_v1(
  p_email text, p_code text, p_first text, p_last text, p_bday text, 
  p_prog uuid, p_yr integer, p_block text, p_teach uuid,
  p_school uuid DEFAULT NULL, p_dept uuid DEFAULT NULL,
  p_password text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE 
  v_uid uuid;
  v_bid uuid;
  v_final_pass text;
BEGIN
  -- Use the literal birthday/password provided (no normalization)
  v_final_pass := COALESCE(p_password, p_bday);

  -- 1. Create Identity & Profile
  v_uid := public.create_new_portal_user_v1(
    p_email, 
    v_final_pass, 
    p_first, 
    p_last,  
    'student', 
    NULL, NULL, NULL, NULL, 
    p_school, -- p_school_id
    p_dept,   -- p_department_id
    p_prog,   -- p_program_id
    p_bday, 
    p_code, 
    p_yr,   
    p_block 
  );
  
  -- 2. Link to Teacher
  UPDATE public.student_profiles SET teacher_id = p_teach WHERE user_id = v_uid;
  
  -- 3. Auto-link to the Block Students table (for Dashboard visibility)
  -- We look for a block that matches the name, year, and teacher.
  SELECT b.id INTO v_bid 
  FROM public.blocks b
  JOIN public.teacher_program_loads tpl ON tpl.id = b.program_load_id
  WHERE b.name = p_block 
    AND b.year = p_yr 
    AND tpl.program_id = p_prog
    AND b.teacher_id = p_teach
  LIMIT 1;

  IF v_bid IS NOT NULL THEN
    INSERT INTO public.block_students (block_id, student_id)
    VALUES (v_bid, v_uid)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.api_enroll_student_v1(text, text, text, text, text, uuid, integer, text, uuid) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
