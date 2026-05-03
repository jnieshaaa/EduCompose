-- RPCs: Academic Management (Bypasses RLS)
-- Handles creation of Schools, Departments, Programs, and Courses.

-- 1. Create School
CREATE OR REPLACE FUNCTION public.api_create_school_v1(
  p_name text,
  p_code text
)
RETURNS uuid AS $$
DECLARE
  v_school_id uuid;
BEGIN
  -- Validate uniqueness (Using ILIKE as an operator)
  IF EXISTS (SELECT 1 FROM public.schools WHERE code ILIKE p_code) THEN
    RAISE EXCEPTION 'A school with code % already exists', p_code;
  END IF;

  INSERT INTO public.schools (name, code)
  VALUES (p_name, p_code)
  RETURNING id INTO v_school_id;

  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Department
CREATE OR REPLACE FUNCTION public.api_create_department_v1(
  p_school_id uuid,
  p_name text,
  p_code text
)
RETURNS uuid AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  -- Validate uniqueness within school
  IF EXISTS (SELECT 1 FROM public.departments WHERE school_id = p_school_id AND code ILIKE p_code) THEN
    RAISE EXCEPTION 'A department with code % already exists in this school', p_code;
  END IF;

  INSERT INTO public.departments (school_id, name, code)
  VALUES (p_school_id, p_name, p_code)
  RETURNING id INTO v_dept_id;

  RETURN v_dept_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Program
CREATE OR REPLACE FUNCTION public.api_create_program_v1(
  p_department_id uuid,
  p_name text,
  p_abbr text
)
RETURNS uuid AS $$
DECLARE
  v_program_id uuid;
BEGIN
  -- Validate uniqueness within department
  IF EXISTS (SELECT 1 FROM public.programs_lookup WHERE department_id = p_department_id AND abbr ILIKE p_abbr) THEN
    RAISE EXCEPTION 'A program with abbreviation % already exists in this department', p_abbr;
  END IF;

  INSERT INTO public.programs_lookup (department_id, name, abbr)
  VALUES (p_department_id, p_name, p_abbr)
  RETURNING id INTO v_program_id;

  RETURN v_program_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Course
CREATE OR REPLACE FUNCTION public.api_create_course_v1(
  p_school_id uuid,
  p_course_code text,
  p_course_title text,
  p_units integer,
  p_department_id uuid DEFAULT NULL,
  p_program_id uuid DEFAULT NULL,
  p_year_level text DEFAULT NULL,
  p_semester text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_course_id uuid;
BEGIN
  -- Validate uniqueness
  IF EXISTS (SELECT 1 FROM public.courses WHERE school_id = p_school_id AND course_code ILIKE p_course_code) THEN
    RAISE EXCEPTION 'A course with code % already exists in this school', p_course_code;
  END IF;

  INSERT INTO public.courses (
    school_id,
    course_code,
    course_title,
    units,
    department_id,
    program_id,
    year_level,
    semester
  )
  VALUES (
    p_school_id,
    p_course_code,
    p_course_title,
    p_units,
    p_department_id,
    p_program_id,
    p_year_level,
    p_semester
  )
  RETURNING id INTO v_course_id;

  RETURN v_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION public.api_create_school_v1(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_create_department_v1(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_create_program_v1(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_create_course_v1(uuid, text, text, integer, uuid, uuid, text, text) TO authenticated;
