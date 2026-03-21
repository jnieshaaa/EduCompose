-- Migration: Add function to check block-course assignments across teachers
-- This allows the system to prevent multiple teachers from assigning the same block to the same course.

CREATE OR REPLACE FUNCTION public.get_assigned_blocks_for_course(p_program_id uuid, p_course_id uuid)
RETURNS TABLE (year integer, name text)
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS to check across all teachers
SET search_path = public
AS $$
  SELECT b.year, b.name 
  FROM blocks b
  JOIN teacher_program_loads tpl ON b.program_load_id = tpl.id
  JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
  WHERE tpl.program_id = p_program_id
  AND tcl.course_id = p_course_id;
$$;

-- Also add a function to fetch all blocks in a program (to see what exists globally)
CREATE OR REPLACE FUNCTION public.get_all_blocks_in_program(p_program_id uuid)
RETURNS TABLE (year integer, name text, student_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH unique_blocks AS (
    SELECT DISTINCT b.year, b.name
    FROM blocks b
    JOIN teacher_program_loads tpl ON b.program_load_id = tpl.id
    WHERE tpl.program_id = p_program_id
  )
  SELECT 
    ub.year, 
    ub.name,
    (SELECT count(*) FROM students s 
     WHERE s.program_id = p_program_id 
     AND s.year = ub.year 
     AND s.block_name = ub.name) as student_count
  FROM unique_blocks ub;
END;
$$;
