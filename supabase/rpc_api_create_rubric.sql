-- RPC: Create Rubric (Bypasses RLS)
-- Handles creation for both Teachers (owned) and Admins (platform/global).

CREATE OR REPLACE FUNCTION public.api_create_rubric_v1(
  p_name text,
  p_description text DEFAULT NULL,
  p_criteria jsonb DEFAULT '[]'::jsonb,
  p_grading_intensity text DEFAULT 'Basic',
  p_is_platform boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_rubric_id uuid;
BEGIN
  -- 1. Get current user and their role
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = v_user_id;

  -- 2. Validate platform rubric permission
  IF p_is_platform AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create platform rubrics';
  END IF;

  -- 3. Check for duplicate names (Case-insensitive using ILIKE operator)
  -- For platform rubrics, check against all platform rubrics
  -- For teacher rubrics, check against that teacher's rubrics
  IF p_is_platform THEN
    IF EXISTS (
      SELECT 1 FROM public.rubrics 
      WHERE name ILIKE p_name AND user_id IS NULL
    ) THEN
      RAISE EXCEPTION 'A platform rubric with this name already exists';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.rubrics 
      WHERE name ILIKE p_name AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You already have a rubric with this name';
    END IF;
  END IF;

  -- 4. Insert the rubric
  INSERT INTO public.rubrics (
    name,
    description,
    criteria,
    grading_intensity,
    user_id,
    created_by,
    created_at
  )
  VALUES (
    p_name,
    COALESCE(p_description, 'Grading intensity: ' || p_grading_intensity),
    p_criteria,
    p_grading_intensity,
    CASE WHEN p_is_platform THEN NULL ELSE v_user_id END,
    v_user_id,
    now()
  )
  RETURNING id INTO v_rubric_id;

  RETURN v_rubric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.api_create_rubric_v1(text, text, jsonb, text, boolean) TO authenticated;
