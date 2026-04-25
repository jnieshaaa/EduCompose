-- 12_FIX_TEACHER_VISIBILITY.SQL
-- Purpose: Allow teachers and students to see their respective data
-- Author: Antigravity

BEGIN;

-- 1. Fix 'users' table policy for teachers
-- Allows teachers to see students who are enrolled in any of their blocks
DROP POLICY IF EXISTS "Teachers can view their students" ON public.users;
CREATE POLICY "Teachers can view their students" ON public.users FOR SELECT 
USING (
    role = 'student' AND (
        teacher_id = auth.uid() OR 
        managed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.block_students bs
            JOIN public.blocks b ON b.id = bs.block_id
            WHERE bs.student_id = public.users.id
            AND b.teacher_id = auth.uid()
        )
    )
);

-- 2. Fix 'essays' table policy for teachers
-- Allows teachers to see essays of students in their blocks
DROP POLICY IF EXISTS "Teachers can view students essays" ON public.essays;
CREATE POLICY "Teachers can view students essays" ON public.essays FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN public.block_students bs ON bs.student_id = u.id
        LEFT JOIN public.blocks b ON b.id = bs.block_id
        WHERE u.id = public.essays.student_id 
        AND (
            u.teacher_id = auth.uid() OR 
            u.managed_by = auth.uid() OR
            b.teacher_id = auth.uid()
        )
    )
);

-- 3. Fix 'blocks' table policy for students
-- Allows students to see the blocks they are enrolled in
DROP POLICY IF EXISTS "Students can view their enrolled blocks" ON public.blocks;
CREATE POLICY "Students can view their enrolled blocks" ON public.blocks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.block_students bs
        WHERE bs.block_id = public.blocks.id
        AND bs.student_id = auth.uid()
    )
);

-- 4. Allow students to see the teacher profile of their blocks
DROP POLICY IF EXISTS "Students can view their teachers" ON public.users;
CREATE POLICY "Students can view their teachers" ON public.users FOR SELECT 
USING (
    role = 'teacher' AND 
    EXISTS (
        SELECT 1 FROM public.blocks b
        JOIN public.block_students bs ON bs.block_id = b.id
        WHERE b.teacher_id = public.users.id
        AND bs.student_id = auth.uid()
    )
);

-- 5. Fix 'teacher_course_loads' for students
DROP POLICY IF EXISTS "Students can view their course loads" ON public.teacher_course_loads;
CREATE POLICY "Students can view their course loads" ON public.teacher_course_loads FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.teacher_program_loads tpl
        JOIN public.block_students bs ON bs.block_id IN (
            SELECT id FROM public.blocks WHERE program_load_id = tpl.id
        )
        WHERE tpl.course_load_id = public.teacher_course_loads.id
        AND bs.student_id = auth.uid()
    )
);

-- 6. Fix 'teacher_program_loads' for students
DROP POLICY IF EXISTS "Students can view their program loads" ON public.teacher_program_loads;
CREATE POLICY "Students can view their program loads" ON public.teacher_program_loads FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.block_students bs
        JOIN public.blocks b ON b.program_load_id = public.teacher_program_loads.id
        WHERE bs.block_id = b.id
        AND bs.student_id = auth.uid()
    )
);

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
