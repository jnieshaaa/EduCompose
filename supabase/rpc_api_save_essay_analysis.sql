-- 1. Ensure essay_analysis_results has all required columns
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='analysis_type') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN analysis_type text DEFAULT 'comprehensive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='content_text') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN content_text text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='grammar_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN grammar_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='readability_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN readability_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='argument_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN argument_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='coherence_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN coherence_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='plagiarism_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN plagiarism_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='ai_detection_results') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN ai_detection_results jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='ai_score') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN ai_score float8;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='overall_score') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN overall_score float8;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='word_count') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN word_count integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='generated_at') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN generated_at timestamptz DEFAULT now();
    END IF;

    -- Add activity_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essay_analysis_results' AND column_name='activity_id') THEN
        ALTER TABLE public.essay_analysis_results ADD COLUMN activity_id uuid;
    END IF;

    -- Ensure unique constraint on essay_id for upserting
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essay_analysis_results_essay_id_key') THEN
        ALTER TABLE public.essay_analysis_results ADD CONSTRAINT essay_analysis_results_essay_id_key UNIQUE (essay_id);
    END IF;
END $$;

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION public.api_save_essay_analysis_v1(
  p_essay_id uuid,
  p_analysis_data jsonb,
  p_analysis_type text DEFAULT 'comprehensive',
  p_plagiarism_data jsonb DEFAULT NULL,
  p_ai_detection_data jsonb DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_student_id uuid;
  v_teacher_id uuid;
  v_activity_id uuid;
  v_activity_title text;
  v_overall_score float8;
BEGIN
  -- Get essay and activity info
  SELECT student_id, teacher_id, activity_id INTO v_student_id, v_teacher_id, v_activity_id
  FROM public.essays
  WHERE id = p_essay_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Essay not found';
  END IF;

  -- Update Essays table primary scores
  v_overall_score := (p_analysis_data->'scores'->>'overall')::float8;
  
  UPDATE public.essays
  SET
    grammar_score = (p_analysis_data->'scores'->>'grammar')::float8,
    readability_score = (p_analysis_data->'scores'->>'readability')::float8,
    coherence_score = (p_analysis_data->'scores'->>'coherence')::float8,
    argument_strength_score = (p_analysis_data->'scores'->>'argument_strength')::float8,
    overall_score = v_overall_score,
    word_count = (p_analysis_data->>'word_count')::integer,
    grammar_errors = p_analysis_data->'detailed_analysis'->'grammar'->'errors',
    style_issues = p_analysis_data->'detailed_analysis'->'readability'->'issues',
    argument_analysis = jsonb_build_object(
      'argumentation', p_analysis_data->'detailed_analysis'->'argumentation',
      'knowledge_graph', p_analysis_data->'detailed_analysis'->'knowledge_graph',
      'coherence', p_analysis_data->'detailed_analysis'->'coherence',
      'plagiarism_results', p_plagiarism_data,
      'ai_detection_results', p_ai_detection_data
    ),
    status = 'analyzed',
    updated_at = now()
  WHERE id = p_essay_id;

  -- Upsert into essay_analysis_results
  INSERT INTO public.essay_analysis_results (
    essay_id,
    activity_id,
    student_id,
    analysis_type,
    content_text,
    grammar_results,
    readability_results,
    argument_results,
    coherence_results,
    plagiarism_results,
    ai_detection_results,
    ai_score,
    overall_score,
    word_count,
    generated_at,
    updated_at,
    results -- fallback/legacy
  )
  VALUES (
    p_essay_id,
    v_activity_id,
    v_student_id,
    p_analysis_type,
    p_analysis_data->>'content',
    p_analysis_data->'detailed_analysis'->'grammar',
    p_analysis_data->'detailed_analysis'->'readability',
    p_analysis_data->'detailed_analysis'->'argumentation',
    p_analysis_data->'detailed_analysis'->'coherence',
    p_plagiarism_data,
    p_ai_detection_data,
    COALESCE((p_ai_detection_data->>'ai_score')::float8, 0),
    v_overall_score,
    (p_analysis_data->>'word_count')::integer,
    now(),
    now(),
    p_analysis_data -- legacy results column
  )
  ON CONFLICT (essay_id) DO UPDATE SET
    analysis_type = EXCLUDED.analysis_type,
    grammar_results = COALESCE(EXCLUDED.grammar_results, essay_analysis_results.grammar_results),
    readability_results = COALESCE(EXCLUDED.readability_results, essay_analysis_results.readability_results),
    argument_results = COALESCE(EXCLUDED.argument_results, essay_analysis_results.argument_results),
    coherence_results = COALESCE(EXCLUDED.coherence_results, essay_analysis_results.coherence_results),
    plagiarism_results = COALESCE(EXCLUDED.plagiarism_results, essay_analysis_results.plagiarism_results),
    ai_detection_results = COALESCE(EXCLUDED.ai_detection_results, essay_analysis_results.ai_detection_results),
    ai_score = COALESCE(EXCLUDED.ai_score, essay_analysis_results.ai_score),
    overall_score = COALESCE(EXCLUDED.overall_score, essay_analysis_results.overall_score),
    word_count = COALESCE(EXCLUDED.word_count, essay_analysis_results.word_count),
    updated_at = now(),
    results = EXCLUDED.results;

  -- Notify student
  SELECT title INTO v_activity_title FROM public.essay_activities WHERE id = v_activity_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    created_at
  )
  VALUES (
    v_student_id,
    'essay_graded',
    'Essay Graded',
    'Your work for "' || COALESCE(v_activity_title, 'Assignment') || '" has been analyzed and graded.',
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to teachers
GRANT EXECUTE ON FUNCTION public.api_save_essay_analysis_v1(uuid, jsonb, text, jsonb, jsonb) TO authenticated;
