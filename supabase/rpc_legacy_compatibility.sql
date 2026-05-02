-- LEGACY COMPATIBILITY
-- Aliasing old function names to new modular ones to prevent frontend breaks.

-- Drop ALL old versions
DROP FUNCTION IF EXISTS public.admin_enroll_student_v4(text, text, text, text, text, text, text, uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS public.admin_enroll_student_v4(text, text, text, text, text, text, text, uuid, integer, text, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_enroll_student_v4(text, text, text, text, text, text, text, uuid, integer, text, uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_enroll_student_v4(
  p_email text, p_student_code text, p_first_name text, p_last_name text, 
  p_middle_name text DEFAULT NULL, p_suffix text DEFAULT NULL, 
  p_birthday text DEFAULT NULL, p_program_id uuid DEFAULT NULL, 
  p_year integer DEFAULT 1, p_block_name text DEFAULT NULL, 
  p_teacher_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_password text DEFAULT NULL
) 
RETURNS uuid AS $$ 
  -- Calls api_enroll_student_v1 with 12 parameters (now including school/dept/password)
  SELECT public.api_enroll_student_v1($1, $2, $3, $4, $7, $8, $9, $10, $11, $12, $13, $14); 
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v4(text, text, text, text, text, text, text, uuid, integer, text, uuid, uuid, uuid, text) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
