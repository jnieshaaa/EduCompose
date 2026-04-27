-- 20_ADD_TEACHER_UPDATE_POLICY_FOR_ESSAYS.SQL
-- Purpose: Allow teachers to update essay scores and status

BEGIN;

-- Allow teachers to update essays for their students
DROP POLICY IF EXISTS "Teachers can update students essays" ON essays;
CREATE POLICY "Teachers can update students essays" ON essays 
FOR UPDATE
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
)
WITH CHECK (
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

-- Also ensure teachers can view essays (already exists, but reinforcing)
DROP POLICY IF EXISTS "Teachers can view students essays" ON essays;
CREATE POLICY "Teachers can view students essays" ON essays 
FOR SELECT 
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

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
