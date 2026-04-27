-- Robust RLS Fix for Teacher Program Loads
-- Purpose: Allow teachers to manage program loads linked to their own course loads, 
-- even if teacher_id is not explicitly provided in the insert.

BEGIN;

-- 1. Fix 'teacher_program_loads' policy
-- Instead of checking teacher_id on the record itself, we check the ownership of the course_load_id
DROP POLICY IF EXISTS "Teachers can manage own program loads" ON public.teacher_program_loads;

CREATE POLICY "Teachers can manage own program loads" ON public.teacher_program_loads
FOR ALL TO authenticated
USING (
  (teacher_id = auth.uid()) OR -- Fallback to direct check
  EXISTS (
    SELECT 1 FROM public.teacher_course_loads tcl
    WHERE tcl.id = public.teacher_program_loads.course_load_id
    AND tcl.teacher_id = auth.uid()
  ) OR
  public.check_is_admin()
)
WITH CHECK (
  (teacher_id = auth.uid() OR teacher_id IS NULL) AND -- Allow insert if teacher_id is correct or missing
  (
    EXISTS (
      SELECT 1 FROM public.teacher_course_loads tcl
      WHERE tcl.id = course_load_id -- Note: In WITH CHECK, we use the column name directly
      AND tcl.teacher_id = auth.uid()
    ) OR
    public.check_is_admin()
  )
);

-- 2. Add a trigger to automatically populate teacher_id if missing (Optional but helpful)
CREATE OR REPLACE FUNCTION public.sync_teacher_id_on_program_load()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.teacher_id IS NULL THEN
    SELECT teacher_id INTO NEW.teacher_id 
    FROM public.teacher_course_loads 
    WHERE id = NEW.course_load_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_teacher_id_program_load ON public.teacher_program_loads;
CREATE TRIGGER tr_sync_teacher_id_program_load
BEFORE INSERT ON public.teacher_program_loads
FOR EACH ROW EXECUTE PROCEDURE public.sync_teacher_id_on_program_load();

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
