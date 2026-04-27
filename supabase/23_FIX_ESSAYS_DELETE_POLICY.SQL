-- 23_FIX_ESSAYS_DELETE_POLICY.SQL
-- Purpose: Allow teachers to delete essays for resubmission logic

BEGIN;

-- Allow teachers to delete essays for their students
DROP POLICY IF EXISTS "Teachers can delete students essays" ON essays;
CREATE POLICY "Teachers can delete students essays" ON essays 
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN public.block_students bs ON bs.student_id = u.id
        LEFT JOIN public.blocks b ON b.id = bs.block_id
        WHERE u.id = essays.student_id 
        AND (
            u.teacher_id = auth.uid() OR 
            u.managed_by = auth.uid() OR
            b.teacher_id = auth.uid()
        )
    )
);

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
