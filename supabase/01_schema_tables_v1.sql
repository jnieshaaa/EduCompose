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
  id                    uuid PRIMARY KEY,
  email                 text UNIQUE NOT NULL,
  first_name            text NOT NULL,
  middle_name           text,
  last_name             text NOT NULL,
  suffix                text,
  role                  text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  title                 text,
  nickname              text,
  student_code          text UNIQUE,
  code                  text UNIQUE,
  program_id            uuid,
  year                  integer,
  block_name            text,
  birthday              text,
  onboarding_completed  boolean DEFAULT false,
  enrollment_status     text DEFAULT 'active',
  is_active             boolean DEFAULT true,
  archived_at           timestamptz,
  status_reason         text,
  last_login            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  teacher_id            uuid,
  managed_by            uuid,
  school_id             uuid REFERENCES public.schools(id),
  department_id         uuid REFERENCES public.departments(id)
);

COMMIT;

-- ==========================================
-- CUMULATIVE REPAIRS & ARCHIVING LOGIC
-- ==========================================
-- The system uses a 'Soft Delete' approach for archiving users:
-- 1. Students: enrollment_status IN ('graduated', 'dropped')
-- 2. Teachers: is_active = false
-- archived_at: tracks when the user was moved to archive.
-- status_reason: stores why the user was archived.
-- ==========================================
BEGIN;

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS teacher_id uuid;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS year_level text;

ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS program_id uuid[];
ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS min_word_count integer;

ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS grading_intensity text;
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS programs uuid[];

ALTER TABLE teacher_program_loads ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE teacher_program_loads ADD COLUMN IF NOT EXISTS teacher_id uuid;

-- Cumulative Repair for USERS table
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS student_code text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS program_id uuid;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS block_name text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS birthday text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS department_id uuid;

-- Ensure foreign keys exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_school_id_fkey') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_department_id_fkey') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);
  END IF;
END $$;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS enrollment_status text DEFAULT 'active';
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS status_reason text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS managed_by uuid;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Fix essay_activities course_id and relationships
DO $$ 
BEGIN
    -- 1. Ensure course_id is single uuid
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'course_id') = 'ARRAY' THEN
        ALTER TABLE public.essay_activities ALTER COLUMN course_id TYPE uuid USING (course_id[1]);
    END IF;

    -- 2. Add FK for courses

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_essay_activities_course') THEN

    -- 3. Ensure block_id is single uuid
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'essay_activities' AND column_name = 'block_id') = 'ARRAY' THEN
        ALTER TABLE public.essay_activities ALTER COLUMN block_id TYPE uuid USING (block_id[1]);
    END IF;

    -- 4. Add FK for blocks
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_essay_activities_block') THEN
        ALTER TABLE public.essay_activities ADD CONSTRAINT fk_essay_activities_block FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE SET NULL;
    END IF;

    -- 5. Fix signup_verification_codes missing column
    ALTER TABLE IF EXISTS public.signup_verification_codes ADD COLUMN IF NOT EXISTS used_at timestamptz;

    -- 6. Ensure rubrics user_id FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rubrics_user_id_fkey') THEN
        ALTER TABLE public.rubrics ADD CONSTRAINT rubrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- 7. Ensure essay_analysis_results FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essays_id_fkey') THEN
        ALTER TABLE public.essay_analysis_results ADD CONSTRAINT essays_id_fkey FOREIGN KEY (essay_id) REFERENCES public.essays(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_student_id_fkey') THEN
        ALTER TABLE public.essay_analysis_results ADD CONSTRAINT analysis_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 8. Ensure essay_comparisons FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comparisons_activity_id_fkey') THEN
        ALTER TABLE public.essay_comparisons ADD CONSTRAINT comparisons_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.essay_activities(id) ON DELETE CASCADE;
    END IF;

    -- 9. Ensure essays student_id FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essays_student_id_fkey') THEN
        ALTER TABLE public.essays ADD CONSTRAINT essays_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 10. Ensure essays block_id FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essays_block_id_fkey') THEN
        ALTER TABLE public.essays ADD CONSTRAINT essays_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE SET NULL;
    END IF;

    -- 11. Ensure blocks program_load FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_block_program_load') THEN
        ALTER TABLE public.blocks ADD CONSTRAINT fk_block_program_load FOREIGN KEY (program_load_id) REFERENCES public.teacher_program_loads(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
