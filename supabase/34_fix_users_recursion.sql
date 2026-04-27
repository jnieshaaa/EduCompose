-- Fix for Users RLS Recursion and Performance
-- Consolidates users policies and uses JWT claims for faster, non-recursive checks

BEGIN;

-- 1. Drop all conflicting select policies on users to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Teachers can view their students" ON public.users;
DROP POLICY IF EXISTS "Students can view their teachers" ON public.users;
DROP POLICY IF EXISTS "Admins can do everything" ON public.users;
DROP POLICY IF EXISTS "Teachers can view all students for enrollment" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can see admins" ON public.users;

-- 2. Consolidated SELECT Policies for 'users'
-- Note: Using auth.jwt() is faster and avoids table-hit recursion

-- Policy: Everyone can see their own profile
CREATE POLICY "users_self_select" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Policy: Teachers and Admins can see all students
CREATE POLICY "teachers_admin_select_students" ON public.users
FOR SELECT TO authenticated
USING (
    role = 'student' AND (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher') OR 
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher') OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR 
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    )
);

-- Policy: Students can see teachers who teach them
CREATE POLICY "students_select_teachers" ON public.users
FOR SELECT TO authenticated
USING (
    role = 'teacher' AND (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'student') OR 
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'student')
    ) AND EXISTS (
        SELECT 1 FROM public.block_students bs
        JOIN public.blocks b ON b.id = bs.block_id
        WHERE bs.student_id = auth.uid()
        AND b.teacher_id = public.users.id
    )
);

-- Policy: Authenticated users can see admins (needed for notifications/support)
CREATE POLICY "everyone_select_admins" ON public.users
FOR SELECT TO authenticated
USING (role = 'admin');

-- 3. Ensure Admin has full access for other operations
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
