-- ==========================================
-- 03_SECURITY_AND_DATA_V1.SQL
-- Purpose: RLS Policies and Initial System Data
-- ==========================================

-- ==========================================
-- SIGNUP VERIFICATION CODES (PUBLIC ACCESS)
-- ==========================================
ALTER TABLE IF EXISTS public.signup_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.signup_verification_codes;
CREATE POLICY "Enable insert for everyone" ON public.signup_verification_codes 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for everyone" ON public.signup_verification_codes;
CREATE POLICY "Enable read for everyone" ON public.signup_verification_codes 
FOR SELECT USING (true);

BEGIN;

-- 1. INITIAL SYSTEM DATA
INSERT INTO system_settings (key, value) 
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2.5 SECURITY DEFINER HELPERS (To prevent RLS recursion)
-- This function checks the role from auth.users metadata to avoid recursive RLS calls.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (
      (raw_app_meta_data->>'role' = 'admin') OR 
      (raw_user_meta_data->>'role' = 'admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 3. USERS TABLE POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can view their students" ON users;
CREATE POLICY "Teachers can view their students" ON users FOR SELECT 
USING (role = 'student' AND (teacher_id = auth.uid() OR managed_by = auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything" ON users;
CREATE POLICY "Admins can do everything" ON users FOR ALL 
USING (public.check_is_admin());

-- 4. ESSAYS TABLE POLICIES
DROP POLICY IF EXISTS "Students can view/manage own essays" ON essays;
CREATE POLICY "Students can view/manage own essays" ON essays FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view students essays" ON essays;
CREATE POLICY "Teachers can view students essays" ON essays FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = essays.student_id AND (teacher_id = auth.uid() OR managed_by = auth.uid())));

-- 5. RUBRICS TABLE POLICIES
DROP POLICY IF EXISTS "Allow public read of rubrics" ON rubrics;
CREATE POLICY "Allow public read of rubrics" ON rubrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage own rubrics" ON rubrics;
CREATE POLICY "Teachers can manage own rubrics" ON rubrics FOR ALL USING (user_id = auth.uid());

-- 6. SYSTEM & ACADEMIC SETTINGS (Public Read)
DROP POLICY IF EXISTS "Public read system_settings" ON system_settings;
CREATE POLICY "Public read system_settings" ON system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic_settings" ON academic_settings;
CREATE POLICY "Public read academic_settings" ON academic_settings FOR SELECT USING (true);

-- 7. METADATA TABLES (Public Read)
DROP POLICY IF EXISTS "Public read programs" ON programs_lookup;
CREATE POLICY "Public read programs" ON programs_lookup FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read departments" ON departments;
CREATE POLICY "Public read departments" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read schools" ON schools;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage schools" ON schools;
CREATE POLICY "Admins can manage schools" ON schools FOR ALL 
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments" ON departments FOR ALL 
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage programs" ON programs_lookup;
CREATE POLICY "Admins can manage programs" ON programs_lookup FOR ALL 
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage system_settings" ON system_settings;
CREATE POLICY "Admins can manage system_settings" ON system_settings FOR ALL 
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage academic_settings" ON academic_settings;
CREATE POLICY "Admins can manage academic_settings" ON academic_settings FOR ALL 
USING (public.check_is_admin());

-- 8. NOTIFICATIONS
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

-- 9. COURSES TABLE POLICIES
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read courses" ON courses;
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses FOR ALL 
USING (public.check_is_admin());

-- 10. TEACHER COURSE LOADS POLICIES
ALTER TABLE teacher_course_loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own course loads" ON teacher_course_loads;
CREATE POLICY "Teachers can manage own course loads" ON teacher_course_loads
FOR ALL USING (teacher_id = auth.uid());

-- 11. TEACHER PROGRAM LOADS POLICIES
ALTER TABLE teacher_program_loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own program loads" ON teacher_program_loads;
CREATE POLICY "Teachers can manage own program loads" ON teacher_program_loads
FOR ALL USING (teacher_id = auth.uid());

COMMIT;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
