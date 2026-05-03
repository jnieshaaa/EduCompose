-- RPC: Submit Essay (Bypasses RLS)
-- Handles both file-based and text-based submissions.
-- Automatically notifies the teacher.

CREATE OR REPLACE FUNCTION public.api_submit_essay_v1(
  p_activity_id uuid,
  p_content text DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_word_count integer DEFAULT 0,
  p_title text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_student_id uuid;
  v_teacher_id uuid;
  v_essay_id uuid;
  v_student_name text;
  v_activity_title text;
BEGIN
  -- 1. Get current student ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Get activity and teacher info
  SELECT teacher_id, title INTO v_teacher_id, v_activity_title
  FROM public.essay_activities
  WHERE id = p_activity_id;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  -- 3. Upsert essay record
  INSERT INTO public.essays (
    student_id,
    activity_id,
    content,
    file_path,
    word_count,
    title,
    status,
    submitted_at,
    updated_at
  )
  VALUES (
    v_student_id,
    p_activity_id,
    COALESCE(p_content, ''),
    p_file_path,
    p_word_count,
    p_title,
    'submitted',
    now(),
    now()
  )
  ON CONFLICT (student_id, activity_id) DO UPDATE SET
    content = EXCLUDED.content,
    file_path = EXCLUDED.file_path,
    word_count = EXCLUDED.word_count,
    title = EXCLUDED.title,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
  RETURNING id INTO v_essay_id;

  -- 4. Get student name for notification
  SELECT first_name || ' ' || last_name INTO v_student_name
  FROM public.users
  WHERE id = v_student_id;

  -- 5. Notify teacher with navigation metadata
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    created_at
  )
  VALUES (
    v_teacher_id,
    'essay_submitted',
    'Essay Submitted',
    COALESCE(v_student_name, 'A student') || ' submitted an essay for "' || COALESCE(v_activity_title, 'Assignment') || '".',
    jsonb_build_object(
      'essayId', v_essay_id::text,
      'studentId', v_student_id::text,
      'activityId', p_activity_id::text,
      'studentName', v_student_name
    )::text,
    'essay',
    now()
  );

  RETURN v_essay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to students
GRANT EXECUTE ON FUNCTION public.api_submit_essay_v1(uuid, text, text, integer, text) TO authenticated;
