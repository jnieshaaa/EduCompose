-- Comprehensive Security Patch for Teacher & Notification Operations (v2.3)
-- Resolves 403 Forbidden errors, schema mismatches, relationship issues, and Admin visibility
-- Author: Antigravity

BEGIN;

-- 1. Ensure schema consistency for notifications
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_id') THEN
        ALTER TABLE notifications ADD COLUMN related_id uuid;
    END IF;
END $$;

-- 2. Relationships and Constraints
DO $$ 
BEGIN 
    -- Relationship for pending_student_registrations to programs_lookup
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_pending_program') THEN
        ALTER TABLE pending_student_registrations 
        ADD CONSTRAINT fk_pending_program 
        FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE CASCADE;
    END IF;

    -- Relationship to users (teacher_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_pending_teacher') THEN
        ALTER TABLE pending_student_registrations 
        ADD CONSTRAINT fk_pending_teacher 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Relationship to courses
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_pending_course') THEN
        ALTER TABLE pending_student_registrations 
        ADD CONSTRAINT fk_pending_course 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    -- Relationship for block_students to users
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_block_students_user') THEN
        ALTER TABLE block_students 
        ADD CONSTRAINT fk_block_students_user 
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Relationship for users to programs_lookup
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_users_program') THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_program 
        FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Ensure RLS is enabled for all target tables
ALTER TABLE IF EXISTS teacher_course_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_program_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS block_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS essay_activities ENABLE ROW LEVEL SECURITY;

-- 4. Policies for 'teacher_course_loads'
DROP POLICY IF EXISTS "Teachers can manage own course loads" ON teacher_course_loads;
CREATE POLICY "Teachers can manage own course loads" ON teacher_course_loads
FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- 5. Policies for 'teacher_program_loads'
DROP POLICY IF EXISTS "Teachers can manage own program loads" ON teacher_program_loads;
CREATE POLICY "Teachers can manage own program loads" ON teacher_program_loads
FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- 6. Policies for 'blocks'
DROP POLICY IF EXISTS "Teachers can manage own blocks" ON blocks;
CREATE POLICY "Teachers can manage own blocks" ON blocks
FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- 7. Policies for 'pending_student_registrations'
DROP POLICY IF EXISTS "Teachers can manage own pending registrations" ON pending_student_registrations;
CREATE POLICY "Teachers can manage own pending registrations" ON pending_student_registrations
FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all pending registrations" ON pending_student_registrations;
CREATE POLICY "Admins can manage all pending registrations" ON pending_student_registrations
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 8. Policies for 'notifications'
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Authenticated users can insert notifications" ON notifications
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
CREATE POLICY "Admins can manage all notifications" ON notifications
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 9. Policies for 'essay_activities'
DROP POLICY IF EXISTS "Teachers can manage own activities" ON essay_activities;
CREATE POLICY "Teachers can manage own activities" ON essay_activities
FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view activities" ON essay_activities;
CREATE POLICY "Students can view activities" ON essay_activities
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage all activities" ON essay_activities;
CREATE POLICY "Admins can manage all activities" ON essay_activities
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 10. Policies for 'block_students'
DROP POLICY IF EXISTS "Anyone can view block students" ON block_students;
CREATE POLICY "Anyone can view block students" ON block_students
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage block students" ON block_students;
CREATE POLICY "Admins can manage block students" ON block_students
FOR ALL TO authenticated
USING (public.check_is_admin());

-- 11. Grant necessary permissions
GRANT ALL ON TABLE teacher_course_loads TO authenticated;
GRANT ALL ON TABLE teacher_program_loads TO authenticated;
GRANT ALL ON TABLE blocks TO authenticated;
GRANT ALL ON TABLE pending_student_registrations TO authenticated;
GRANT ALL ON TABLE notifications TO authenticated;
GRANT ALL ON TABLE essay_activities TO authenticated;
GRANT ALL ON TABLE block_students TO authenticated;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
