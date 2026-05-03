-- RPC: Submit or Update Essay (Bypasses RLS)
-- This allows students to save their work and notify teachers without manual RLS policy management.
-- It automatically links the essay and notification to the correct users.

CREATE OR REPLACE FUNCTION public.api_submit_essay_v1(
  p_activity_id uuid,
  p_content text,
  p_file_path text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_status text DEFAULT 'submitted',
  p_block_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_student_id uuid;
  v_student_name text;
  v_activity_title text;
  v_essay_id uuid;
BEGIN
  -- 1. Get the current student's ID and Name from the auth context
  v_student_id := auth.uid();
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get student name for notification
  SELECT COALESCE(first_name || ' ' || last_name, 'A student') INTO v_student_name
  FROM public.users
  WHERE id = v_student_id;

  -- Get activity title for notification
  SELECT title INTO v_activity_title
  FROM public.essay_activities
  WHERE id = p_activity_id;

  -- 2. Check if an essay already exists for this student and activity
  SELECT id INTO v_essay_id 
  FROM public.essays 
  WHERE student_id = v_student_id AND activity_id = p_activity_id
  LIMIT 1;

  IF v_essay_id IS NOT NULL THEN
    -- Update existing submission
    UPDATE public.essays 
    SET 
      content = p_content,
      file_path = p_file_path,
      title = p_title,
      status = p_status,
      block_id = COALESCE(p_block_id, block_id),
      teacher_id = COALESCE(p_teacher_id, teacher_id),
      updated_at = now()
    WHERE id = v_essay_id;
  ELSE
    -- Insert new submission
    INSERT INTO public.essays (
      student_id, 
      activity_id, 
      content, 
      file_path, 
      title, 
      status, 
      block_id, 
      teacher_id
    )
    VALUES (
      v_student_id, 
      p_activity_id, 
      p_content, 
      p_file_path, 
      p_title, 
      p_status, 
      p_block_id, 
      p_teacher_id
    )
    RETURNING id INTO v_essay_id;
  END IF;

  -- 3. Create a notification for the teacher if teacher_id is provided
  IF p_teacher_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      created_at
    )
    VALUES (
      p_teacher_id,
      'submission_received',
      'New Essay Work',
      v_student_name || ' sent their work: "' || COALESCE(v_activity_title, 'Assignment') || '".',
      now()
    );
  END IF;

  RETURN v_essay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.api_submit_essay_v1(uuid, text, text, text, text, uuid, uuid) TO authenticated;
