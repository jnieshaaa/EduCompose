-- ==========================================
-- 02_IDENTITY_LOGIC_V1.SQL
-- Purpose: Constraints, Triggers, and Core RPCs (V1)
-- ==========================================

BEGIN;

-- 4. PROFILE CREATION RPC (Bypasses RLS for Signup)
CREATE OR REPLACE FUNCTION public.create_profile_v1(
  p_id uuid,
  p_email text,
  p_role text,
  p_first_name text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, role, first_name, is_active, onboarding_completed)
  VALUES (p_id, p_email, p_role, p_first_name, true, false)
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. FOREIGN KEY CONSTRAINTS
-- Ensuring all data is linked to the unified public.users table
ALTER TABLE block_students DROP CONSTRAINT IF EXISTS fk_block;
ALTER TABLE block_students ADD CONSTRAINT fk_block FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE;
ALTER TABLE block_students DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE block_students ADD CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS fk_teacher;
ALTER TABLE blocks ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS fk_block_program_load;
ALTER TABLE blocks ADD CONSTRAINT fk_block_program_load FOREIGN KEY (program_load_id) REFERENCES teacher_program_loads(id) ON DELETE CASCADE;

ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_school;
ALTER TABLE courses ADD CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_dept;
ALTER TABLE courses ADD CONSTRAINT fk_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_program;
ALTER TABLE courses ADD CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;

ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_school;
ALTER TABLE departments ADD CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS fk_rubric;
ALTER TABLE essay_activities ADD CONSTRAINT fk_rubric FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE SET NULL;
ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS fk_teacher;
ALTER TABLE essay_activities ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS fk_essay;
ALTER TABLE essay_analysis_results ADD CONSTRAINT fk_essay FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE CASCADE;
ALTER TABLE essay_analysis_results DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE essay_analysis_results ADD CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE essay_comparisons DROP CONSTRAINT IF EXISTS fk_activity;
ALTER TABLE essay_comparisons ADD CONSTRAINT fk_activity FOREIGN KEY (activity_id) REFERENCES essay_activities(id) ON DELETE CASCADE;

ALTER TABLE essays DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE essays ADD CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE essays DROP CONSTRAINT IF EXISTS fk_activity;
ALTER TABLE essays ADD CONSTRAINT fk_activity FOREIGN KEY (activity_id) REFERENCES essay_activities(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE notifications ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE programs_lookup DROP CONSTRAINT IF EXISTS fk_dept;
ALTER TABLE programs_lookup ADD CONSTRAINT fk_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_program;
ALTER TABLE users ADD CONSTRAINT fk_user_program FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE SET NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_managed_by;
ALTER TABLE users ADD CONSTRAINT fk_user_managed_by FOREIGN KEY (managed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE teacher_course_loads DROP CONSTRAINT IF EXISTS fk_teacher;
ALTER TABLE teacher_course_loads ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE teacher_course_loads DROP CONSTRAINT IF EXISTS fk_course;
ALTER TABLE teacher_course_loads ADD CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE teacher_program_loads DROP CONSTRAINT IF EXISTS fk_load;
ALTER TABLE teacher_program_loads ADD CONSTRAINT fk_load FOREIGN KEY (course_load_id) REFERENCES teacher_course_loads(id) ON DELETE CASCADE;
ALTER TABLE teacher_program_loads DROP CONSTRAINT IF EXISTS fk_program;
ALTER TABLE teacher_program_loads ADD CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES programs_lookup(id) ON DELETE CASCADE;

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_academic_settings_modtime BEFORE UPDATE ON academic_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON departments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_essay_analysis_results_modtime BEFORE UPDATE ON essay_analysis_results FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_essays_modtime BEFORE UPDATE ON essays FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_programs_lookup_modtime BEFORE UPDATE ON programs_lookup FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schools_modtime BEFORE UPDATE ON schools FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. CORE IDENTITY RPC: Create Unified Portal User (V1)
-- Drop old overloading signatures to prevent PGRST203 errors
DROP FUNCTION IF EXISTS public.create_new_portal_user_v1(text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_new_portal_user_v1(
  p_email         text,
  p_password      text,
  p_first_name    text,
  p_last_name     text,
  p_role          text,
  p_middle_name   text DEFAULT NULL,
  p_suffix        text DEFAULT NULL,
  p_title         text DEFAULT NULL,
  p_nickname      text DEFAULT NULL,
  p_school_id     uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_birthday      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_instance_id uuid;
BEGIN
  -- Get instance ID from existing users or use default
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN v_instance_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- Create or find the user ID
  SELECT id INTO v_user_id FROM public.users WHERE email = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- 1. Insert into auth.users (Core identity)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_super_admin, is_sso_user, confirmation_token, recovery_token
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
    now(), 
    jsonb_build_object('provider', 'email', 'providers', array['email']), 
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role),
    now(), now(), false, false, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email))), 'email', lower(trim(p_email)), now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Insert into public.users (Profile data)
  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name, suffix, title, nickname,
    role, school_id, department_id, birthday, is_active
  ) VALUES (
    v_user_id, lower(trim(p_email)), p_first_name, p_middle_name, p_last_name, p_suffix, p_title, p_nickname,
    p_role, p_school_id, p_department_id, p_birthday, true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    suffix = EXCLUDED.suffix,
    title = EXCLUDED.title,
    nickname = EXCLUDED.nickname,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    department_id = EXCLUDED.department_id,
    birthday = EXCLUDED.birthday,
    is_active = EXCLUDED.is_active;

  RETURN v_user_id;
END;
$$;

-- 4. RPC: Admin Enroll Student (V1)
CREATE OR REPLACE FUNCTION public.admin_enroll_student_v1(
  p_email        text,
  p_student_code text,
  p_first_name   text,
  p_last_name    text,
  p_middle_name  text DEFAULT NULL,
  p_suffix       text DEFAULT NULL,
  p_birthday     text DEFAULT NULL,
  p_program_id   uuid DEFAULT NULL,
  p_year         integer DEFAULT 1,
  p_block_name   text DEFAULT NULL,
  p_teacher_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.users 
  WHERE email = lower(trim(p_email)) OR student_code = p_student_code 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  INSERT INTO public.users (
    id, email, student_code, first_name, last_name, middle_name, suffix, 
    birthday, program_id, year, block_name, teacher_id, role, onboarding_completed
  ) VALUES (
    v_user_id, lower(trim(p_email)), p_student_code, p_first_name, p_last_name, p_middle_name, p_suffix,
    p_birthday, p_program_id, p_year, p_block_name, p_teacher_id, 'student', false
  )
  ON CONFLICT (id) DO UPDATE SET
    student_code = EXCLUDED.student_code,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    program_id = EXCLUDED.program_id,
    year = EXCLUDED.year,
    block_name = EXCLUDED.block_name;

  RETURN v_user_id;
END;
$$;

-- 5. RPC: Get Student Login Email (V1)
CREATE OR REPLACE FUNCTION public.get_student_login_email_v1(p_student_code text)
RETURNS TABLE (
    id uuid,
    student_code text,
    email text,
    first_name text,
    middle_name text,
    last_name text,
    is_active boolean,
    onboarding_completed boolean,
    birthday text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, u.student_code, u.email, u.first_name, u.middle_name, u.last_name, 
        u.is_active, u.onboarding_completed, u.birthday
    FROM public.users u
    WHERE u.student_code = p_student_code
      AND u.role = 'student';
END;
$$;

-- 6. RPC: Admin Reset Password (V1)
CREATE OR REPLACE FUNCTION public.admin_reset_student_password_v1(
  p_email text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE email = lower(trim(p_email));
  
  RETURN FOUND;
END;
$$;

-- 7. RPC: Verify Signup Code
CREATE OR REPLACE FUNCTION public.verify_signup_code(p_email text, p_code text)
RETURNS boolean AS $$
DECLARE
    v_valid boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.signup_verification_codes 
        WHERE email = LOWER(TRIM(p_email)) 
        AND code = p_code 
        AND expires_at > now()
        AND used_at IS NULL
    ) INTO v_valid;

    IF v_valid THEN
        -- Mark the code as used
        UPDATE public.signup_verification_codes 
        SET used_at = now() 
        WHERE email = LOWER(TRIM(p_email)) AND code = p_code;
    END IF;

    RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. COMPATIBILITY WRAPPERS (Aliases)
-- ==========================================

CREATE OR REPLACE FUNCTION public.admin_provision_student(p_email text, p_password text, p_first_name text, p_last_name text, p_student_code text, p_middle_name text DEFAULT NULL) 
RETURNS uuid AS $$ SELECT public.create_new_portal_user_v1($1, $2, $3, $4, 'student', $6, NULL, $5); $$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_student_login_email_v2(p_student_code text)
RETURNS TABLE (id uuid, student_code text, email text, first_name text, middle_name text, last_name text, is_active boolean, onboarding_completed boolean, birthday text) AS $$ SELECT * FROM public.get_student_login_email_v1($1); $$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_enroll_student_v4(p_email text, p_student_code text, p_first_name text, p_last_name text, p_middle_name text DEFAULT NULL, p_suffix text DEFAULT NULL, p_birthday text DEFAULT NULL, p_program_id uuid DEFAULT NULL, p_year integer DEFAULT 1, p_block_name text DEFAULT NULL, p_teacher_id uuid DEFAULT NULL) 
RETURNS uuid AS $$ SELECT public.admin_enroll_student_v1($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11); $$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_new_portal_user_v6(p_email text, p_password text, p_first_name text, p_last_name text, p_role text, p_middle_name text DEFAULT NULL, p_suffix text DEFAULT NULL, p_code text DEFAULT NULL, p_birthday text DEFAULT NULL)
RETURNS uuid AS $$ SELECT public.create_new_portal_user_v1($1, $2, $3, $4, $5, $6, $7, $8, $9); $$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_enroll_student_v3(p_email text, p_password text, p_first_name text, p_last_name text, p_student_code text, p_teacher_id uuid, p_program_id uuid, p_year integer, p_block_name text, p_middle_name text DEFAULT NULL, p_birthday text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  v_id := public.create_new_portal_user_v1($1, $2, $3, $4, 'student', $10, NULL, $5, $11);
  UPDATE public.users SET teacher_id = $6, program_id = $7, year = $8, block_name = $9 WHERE id = v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. PERMISSIONS (GRANTS)
-- ==========================================

GRANT EXECUTE ON FUNCTION public.create_new_portal_user_v1 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v1 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_email_v1 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_student_password_v1 TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.admin_provision_student TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_email_v2 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v4 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_new_portal_user_v6 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student_v3 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_signup_code TO authenticated, anon;

COMMIT;
