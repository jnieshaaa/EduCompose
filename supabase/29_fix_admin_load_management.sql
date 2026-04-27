-- Fix Admin Permissions for Teacher Loads and Blocks
-- Purpose: Allow Admins to assign loads and manage blocks for any teacher

BEGIN;

-- 1. Policies for 'teacher_course_loads'
DROP POLICY IF EXISTS "Admins can manage all course loads" ON teacher_course_loads;
CREATE POLICY "Admins can manage all course loads" ON teacher_course_loads
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 2. Policies for 'teacher_program_loads'
DROP POLICY IF EXISTS "Admins can manage all program loads" ON teacher_program_loads;
CREATE POLICY "Admins can manage all program loads" ON teacher_program_loads
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 3. Policies for 'blocks'
DROP POLICY IF EXISTS "Admins can manage all blocks" ON blocks;
CREATE POLICY "Admins can manage all blocks" ON blocks
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 4. Ensure RLS is active
ALTER TABLE IF EXISTS teacher_course_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_program_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocks ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions (just in case)
GRANT ALL ON TABLE teacher_course_loads TO authenticated;
GRANT ALL ON TABLE teacher_program_loads TO authenticated;
GRANT ALL ON TABLE blocks TO authenticated;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
