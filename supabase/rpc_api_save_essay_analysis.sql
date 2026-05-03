-- Ensure notifications table has navigation columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_type') THEN
        ALTER TABLE public.notifications ADD COLUMN related_type text;
    END IF;
END $$;

-- Refactor Storage RPC to use JSONB merging for all results columns
-- This prevents data loss when partial analysis results (e.g. just plagiarism) are saved.

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
    grammar_score = COALESCE((p_analysis_data->'scores'->>'grammar')::float8, grammar_score),
    readability_score = COALESCE((p_analysis_data->'scores'->>'readability')::float8, readability_score),
    coherence_score = COALESCE((p_analysis_data->'scores'->>'coherence')::float8, coherence_score),
    argument_strength_score = COALESCE((p_analysis_data->'scores'->>'argument_strength')::float8, argument_strength_score),
    overall_score = COALESCE(v_overall_score, overall_score),
    word_count = COALESCE((p_analysis_data->>'word_count')::integer, word_count),
    grammar_errors = COALESCE(p_analysis_data->'detailed_analysis'->'grammar'->'errors', grammar_errors),
    style_issues = COALESCE(p_analysis_data->'detailed_analysis'->'readability'->'issues', style_issues),
    argument_analysis = CASE 
      WHEN (p_analysis_data->'detailed_analysis') IS NOT NULL OR p_plagiarism_data IS NOT NULL OR p_ai_detection_data IS NOT NULL THEN
        jsonb_build_object(
          'argumentation', COALESCE(p_analysis_data->'detailed_analysis'->'argumentation', argument_analysis->'argumentation'),
          'knowledge_graph', COALESCE(p_analysis_data->'detailed_analysis'->'knowledge_graph', argument_analysis->'knowledge_graph'),
          'coherence', COALESCE(p_analysis_data->'detailed_analysis'->'coherence', argument_analysis->'coherence'),
          'plagiarism_results', COALESCE(p_plagiarism_data, argument_analysis->'plagiarism_results'),
          'ai_detection_results', COALESCE(p_ai_detection_data, argument_analysis->'ai_detection_results')
        )
      ELSE argument_analysis
    END,
    status = 'analyzed',
    updated_at = now()
  WHERE id = p_essay_id;

  -- Upsert into essay_analysis_results with deep merging
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
    grammar_score,
    readability_score,
    coherence_score,
    argument_strength_score,
    word_count,
    generated_at,
    updated_at,
    results
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
    (p_analysis_data->'scores'->>'grammar')::float8,
    (p_analysis_data->'scores'->>'readability')::float8,
    (p_analysis_data->'scores'->>'coherence')::float8,
    (p_analysis_data->'scores'->>'argument_strength')::float8,
    (p_analysis_data->>'word_count')::integer,
    now(),
    now(),
    p_analysis_data
  )
  ON CONFLICT (essay_id) DO UPDATE SET
    analysis_type = EXCLUDED.analysis_type,
    -- Use || operator for JSONB columns to merge instead of replace
    grammar_results = COALESCE(essay_analysis_results.grammar_results, '{}'::jsonb) || COALESCE(EXCLUDED.grammar_results, '{}'::jsonb),
    readability_results = COALESCE(essay_analysis_results.readability_results, '{}'::jsonb) || COALESCE(EXCLUDED.readability_results, '{}'::jsonb),
    argument_results = COALESCE(essay_analysis_results.argument_results, '{}'::jsonb) || COALESCE(EXCLUDED.argument_results, '{}'::jsonb),
    coherence_results = COALESCE(essay_analysis_results.coherence_results, '{}'::jsonb) || COALESCE(EXCLUDED.coherence_results, '{}'::jsonb),
    plagiarism_results = COALESCE(essay_analysis_results.plagiarism_results, '{}'::jsonb) || COALESCE(EXCLUDED.plagiarism_results, '{}'::jsonb),
    ai_detection_results = COALESCE(essay_analysis_results.ai_detection_results, '{}'::jsonb) || COALESCE(EXCLUDED.ai_detection_results, '{}'::jsonb),
    ai_score = COALESCE(EXCLUDED.ai_score, essay_analysis_results.ai_score),
    overall_score = COALESCE(EXCLUDED.overall_score, essay_analysis_results.overall_score),
    grammar_score = COALESCE(EXCLUDED.grammar_score, essay_analysis_results.grammar_score),
    readability_score = COALESCE(EXCLUDED.readability_score, essay_analysis_results.readability_score),
    coherence_score = COALESCE(EXCLUDED.coherence_score, essay_analysis_results.coherence_score),
    argument_strength_score = COALESCE(EXCLUDED.argument_strength_score, essay_analysis_results.argument_strength_score),
    word_count = COALESCE(EXCLUDED.word_count, essay_analysis_results.word_count),
    updated_at = now(),
    results = COALESCE(essay_analysis_results.results, '{}'::jsonb) || EXCLUDED.results;

  -- Cleanup Legacy Notifications (Part of the stabilization)
  DELETE FROM public.notifications WHERE type = 'essay_feedback';

  -- Notify student with navigation metadata
  SELECT title INTO v_activity_title FROM public.essay_activities WHERE id = v_activity_id;

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
    v_student_id,
    'essay_graded',
    'Grade Available',
    'Your essay for "' || COALESCE(v_activity_title, 'Assignment') || '" has been analyzed and graded.',
    jsonb_build_object(
      'essayId', p_essay_id::text,
      'activityId', v_activity_id::text,
      'studentId', v_student_id::text
    )::text,
    'essay',
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.api_save_essay_analysis_v1(uuid, jsonb, text, jsonb, jsonb) TO authenticated;
