-- RPC: Create Activity and Notify Students (Bypasses RLS)
-- Consolidated function to create an activity, optionally create a rubric,
-- and automatically notify all enrolled students in the selected blocks.

CREATE OR REPLACE FUNCTION public.api_create_activity_v1(
  p_title text,
  p_instructions text,
  p_due_date date DEFAULT NULL,
  p_rubric_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_block_ids uuid[] DEFAULT '{}',
  p_min_word_count integer DEFAULT 150,
  p_academic_year text DEFAULT NULL,
  p_term text DEFAULT NULL,
  p_suggested_rubric jsonb DEFAULT NULL -- For AI suggestions
)
RETURNS uuid AS $$
DECLARE
  v_teacher_id uuid;
  v_activity_id uuid;
  v_rubric_id uuid := p_rubric_id;
  v_program_ids uuid[];
BEGIN
  -- 1. Get current teacher ID
  v_teacher_id := auth.uid();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Handle AI Suggested Rubric if provided
  IF p_suggested_rubric IS NOT NULL THEN
    INSERT INTO public.rubrics (
      name,
      description,
      criteria,
      grading_intensity,
      user_id,
      created_by
    )
    VALUES (
      p_suggested_rubric->>'name',
      COALESCE(p_suggested_rubric->>'description', ''),
      p_suggested_rubric->'criteria',
      COALESCE(p_suggested_rubric->>'grading_intensity', 'Basic'),
      v_teacher_id,
      v_teacher_id
    )
    RETURNING id INTO v_rubric_id;
  END IF;

  -- 3. Resolve Program IDs from the provided blocks
  SELECT array_agg(DISTINCT program_id) INTO v_program_ids
  FROM public.teacher_program_loads tpl
  JOIN public.blocks b ON b.id = ANY(p_block_ids)
  WHERE b.program_load_id = tpl.id;

  -- 4. Create the Activity
  INSERT INTO public.essay_activities (
    teacher_id,
    title,
    instructions,
    due_date,
    rubric_id,
    course_id,
    block_id, -- Legacy: we store the first block ID
    program_id,
    min_word_count,
    academic_year,
    term
  )
  VALUES (
    v_teacher_id,
    p_title,
    p_instructions,
    p_due_date,
    v_rubric_id,
    p_course_id,
    CASE WHEN array_length(p_block_ids, 1) > 0 THEN p_block_ids[1] ELSE NULL END,
    v_program_ids,
    p_min_word_count,
    p_academic_year,
    p_term
  )
  RETURNING id INTO v_activity_id;

  -- 5. Notify all students in the selected blocks with navigation metadata
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    created_at
  )
  SELECT 
    bs.student_id,
    'new_activity',
    'New Activity Assigned',
    'A new activity "' || p_title || '" has been posted.',
    v_activity_id::text, -- Just the ID for activities is usually enough, or match expected JSON format
    'essay_activities',
    now()
  FROM public.block_students bs
  WHERE bs.block_id = ANY(p_block_ids);

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to teachers
GRANT EXECUTE ON FUNCTION public.api_create_activity_v1(text, text, date, uuid, uuid, uuid[], integer, text, text, jsonb) TO authenticated;
