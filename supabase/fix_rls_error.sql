-- ==========================================
-- FIX_RLS_ERROR.SQL
-- Purpose: Resolve "RLS references user metadata" security warnings
-- by moving role checks from auth.users metadata to public.users table.
-- ==========================================

BEGIN;

-- 1. Redefine role check functions to use public.users table
-- We use SECURITY DEFINER to bypass RLS on public.users and avoid recursion.
-- We use SET search_path = public to ensure we query the correct tables.

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_teacher()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'teacher' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_student()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'student' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update 'public.users' policies to remove metadata dependency
-- These are based on the logic from 34_fix_users_recursion.sql

DROP POLICY IF EXISTS "teachers_admin_select_students" ON public.users;
CREATE POLICY "teachers_admin_select_students" ON public.users
FOR SELECT TO authenticated
USING (
    role = 'student' AND (
        public.check_is_teacher() OR 
        public.check_is_admin()
    )
);

DROP POLICY IF EXISTS "students_select_teachers" ON public.users;
CREATE POLICY "students_select_teachers" ON public.users
FOR SELECT TO authenticated
USING (
    role = 'teacher' AND 
    public.check_is_student() AND 
    EXISTS (
        SELECT 1 FROM public.block_students bs
        JOIN public.blocks b ON b.id = bs.block_id
        WHERE bs.student_id = auth.uid()
        AND b.teacher_id = public.users.id
    )
);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 3. Ensure 'public.block_students' policies are using the new secure functions
-- The existing policy "Teachers can manage students in own blocks" already calls check_is_admin()
-- By updating the function above, the policy becomes secure automatically.

-- 4. Extra Security: Update profile policies if they used metadata
DROP POLICY IF EXISTS "Teachers and Admins can view student profiles" ON public.student_profiles;
CREATE POLICY "Teachers and Admins can view student profiles" ON public.student_profiles
FOR SELECT TO authenticated
USING (
    public.check_is_teacher() OR 
    public.check_is_admin()
);

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
