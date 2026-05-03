-- RPC: Request Resubmission (Bypasses RLS)
-- Allows students to request a resubmission by notifying the teacher.

CREATE OR REPLACE FUNCTION public.api_request_resubmission_v1(
  p_activity_id uuid,
  p_teacher_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_student_id uuid;
  v_student_name text;
  v_activity_title text;
BEGIN
  -- 1. Get current student
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Get names for notification
  SELECT COALESCE(first_name || ' ' || last_name, 'A student') INTO v_student_name
  FROM public.users
  WHERE id = v_student_id;

  SELECT title INTO v_activity_title
  FROM public.essay_activities
  WHERE id = p_activity_id;

  -- 3. Insert notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    created_at
  )
  VALUES (
    p_teacher_id,
    'resubmission_request',
    'Resubmit Request',
    v_student_name || ' wants to fix their work for: "' || COALESCE(v_activity_title, 'Assignment') || '".',
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION public.api_request_resubmission_v1(uuid, uuid) TO authenticated;
