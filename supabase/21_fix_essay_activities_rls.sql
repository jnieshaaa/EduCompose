-- 21_fix_essay_activities_rls.sql
-- This script fixes the RLS policy for essay_activities to support the array-based assignment system
-- and correctly link students using their auth_user_id.

-- 1. Update Teachers manage policy if needed (usually fine, but let's be safe)
DROP POLICY IF EXISTS "Teachers can manage their activities" ON public.essay_activities;
CREATE POLICY "Teachers can manage their activities"
  ON public.essay_activities FOR ALL TO authenticated
  USING (
    auth.uid() = teacher_id
    OR is_admin()
  )
  WITH CHECK (
    auth.uid() = teacher_id
    OR is_admin()
  );

-- 2. Update Students view policy to support arrays and direct auth_user_id link
DROP POLICY IF EXISTS "Students can view assigned activities" ON public.essay_activities;
CREATE POLICY "Students can view assigned activities"
  ON public.essay_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.block_students bs
      JOIN public.students s ON s.id = bs.student_id
      WHERE s.auth_user_id = auth.uid()
      AND (
        (essay_activities.block_id IS NOT NULL AND bs.block_id = ANY(essay_activities.block_id))
        OR (essay_activities.course_id IS NOT NULL AND s.program_id = ANY(essay_activities.program_id)) -- Simplified check for program
      )
    )
    OR (
       -- Fallback if teacher assigned to "all" in a way that matches course?
       -- Or if the student is onboarded and the activity matches their course/block
       EXISTS (
         SELECT 1 FROM public.students s
         WHERE s.auth_user_id = auth.uid()
         AND (
           (essay_activities.course_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.block_students bs2 
             JOIN public.blocks b2 ON b2.id = bs2.block_id
             JOIN public.teacher_program_loads tpl2 ON tpl2.id = b2.program_load_id
             -- If the activity is linked to a course that the student is enrolled in
             WHERE bs2.student_id = s.id
             AND tpl2.course_load_id IN (
               SELECT id FROM public.teacher_course_loads WHERE course_id = ANY(essay_activities.course_id)
             )
           ))
         )
       )
    )
  );

-- 3. Also fix Essays RLS to use direct auth_user_id for students
DROP POLICY IF EXISTS "Students can manage their own essays" ON public.essays;
CREATE POLICY "Students can manage their own essays"
  ON public.essays FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = essays.student_id
      AND s.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = essays.student_id
      AND s.auth_user_id = auth.uid()
    )
  );

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
