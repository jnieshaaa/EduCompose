-- ==========================================
-- 01_SCHEMA_TABLES_V1.SQL
-- Purpose: Primary Table Definitions (Blueprint)
-- ==========================================

BEGIN;

-- 0. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ACADEMIC SETTINGS
CREATE TABLE IF NOT EXISTS academic_settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ay_start               integer NOT NULL,
  ay_end                 integer NOT NULL,
  current_semester       text NOT NULL,
  first_sem_start_month  text,
  first_sem_end_month    text,
  second_sem_start_month text,
  second_sem_end_month   text,
  summer_start_month     text,
  summer_end_month       text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- 2. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  action_type  text NOT NULL,
  description  text NOT NULL,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. BLOCK STUDENTS
CREATE TABLE IF NOT EXISTS block_students (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id     uuid NOT NULL,
  student_id   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4. BLOCKS
CREATE TABLE IF NOT EXISTS blocks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_load_id  uuid NOT NULL,
  year             integer NOT NULL,
  name             text NOT NULL,
  teacher_id       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 5. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid NOT NULL,
  course_code    text NOT NULL,
  course_title   text NOT NULL,
  units          integer NOT NULL,
  department_id  uuid,
  program_id     uuid,
  user_id        uuid REFERENCES public.users(id),
  year_level     text,
  semester       text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 6. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid NOT NULL,
  name           text NOT NULL,
  code           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 7. ESSAY ACTIVITIES
CREATE TABLE IF NOT EXISTS essay_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  block_id        uuid,
  rubric_id       uuid,
  due_date        date,
  instructions    text,
  course_id       uuid,
  academic_year   text,
  term            text,
  teacher_id      uuid,
  program_id      uuid[],
  min_word_count  integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 8. ESSAY ANALYSIS RESULTS
CREATE TABLE IF NOT EXISTS essay_analysis_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id     uuid NOT NULL,
  student_id   uuid NOT NULL,
  results      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 9. ESSAY COMPARISONS
CREATE TABLE IF NOT EXISTS essay_comparisons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id  uuid NOT NULL,
  comparison_data jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 10. ESSAYS
CREATE TABLE IF NOT EXISTS essays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL,
  activity_id  uuid NOT NULL,
  content      text NOT NULL,
  file_url     text,
  status       text DEFAULT 'draft',
  grading      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  type         text NOT NULL,
  title        text NOT NULL,
  message      text NOT NULL,
  is_read      boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 12. PENDING STUDENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS pending_student_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL,
  student_code  text NOT NULL,
  first_name    text NOT NULL,
  middle_name   text,
  last_name     text NOT NULL,
  suffix        text,
  email         text NOT NULL,
  birthday      text,
  program_id    uuid,
  year          integer,
  block_name    text,
  course_id     uuid,
  academic_year text,
  term          text,
  processed     boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 13. PROGRAMS LOOKUP
CREATE TABLE IF NOT EXISTS programs_lookup (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  uuid NOT NULL,
  name           text NOT NULL,
  abbr           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 14. RUBRICS
CREATE TABLE IF NOT EXISTS rubrics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid,
  name              text NOT NULL,
  description       text,
  criteria          jsonb,
  grading_intensity text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  programs          uuid[]
);

-- 15. SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  code           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 16. SIGNUP VERIFICATION CODES
CREATE TABLE IF NOT EXISTS signup_verification_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  code         text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 17. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid
);

-- 18. TEACHER COURSE LOADS
CREATE TABLE IF NOT EXISTS teacher_course_loads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL,
  course_id     uuid NOT NULL,
  academic_year text,
  term          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 19. TEACHER PROGRAM LOADS
CREATE TABLE IF NOT EXISTS teacher_program_loads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_load_id  uuid NOT NULL,
  program_id      uuid NOT NULL,
  teacher_id      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 20. USERS (Unified identity table)
CREATE TABLE IF NOT EXISTS users (
  id                    uuid PRIMARY KEY, -- Matches auth.users.id
  email                 text UNIQUE NOT NULL,
  first_name            text NOT NULL,
  middle_name           text,
  last_name             text NOT NULL,
  suffix                text,
  role                  text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  birthday              text,
  is_active             boolean DEFAULT true,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 21. ADMIN PROFILES
CREATE TABLE IF NOT EXISTS admin_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_super_admin boolean DEFAULT false,
  UNIQUE(user_id)
);

-- 22. TEACHER PROFILES
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                text,
  nickname             text,
  school_id            uuid REFERENCES public.schools(id),
  department_id        uuid REFERENCES public.departments(id),
  onboarding_completed boolean DEFAULT false,
  UNIQUE(user_id)
);

-- 23. STUDENT PROFILES
CREATE TABLE IF NOT EXISTS student_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_code         text UNIQUE NOT NULL,
  school_id            uuid REFERENCES public.schools(id),
  department_id        uuid REFERENCES public.departments(id),
  program_id           uuid REFERENCES public.programs_lookup(id),
  year                 integer,
  block_name           text,
  teacher_id           uuid REFERENCES public.users(id),
  managed_by           uuid REFERENCES public.users(id),
  enrollment_status    text DEFAULT 'active',
  onboarding_completed boolean DEFAULT false,
  UNIQUE(user_id)
);

COMMIT;

COMMIT;
