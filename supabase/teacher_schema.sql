-- EduCompose - Teacher-side core schema for Supabase
-- You can paste this into Supabase SQL editor (Run) to create the tables.
-- It is designed to match the current frontend types and teacher UI.

-- NOTE:
-- - Uses bigint primary keys (Supabase default).
-- - Uses simple text enums via CHECK constraints for portability.
-- - Assumes Supabase auth is enabled; you can later connect teachers -> auth.users.

--------------------------------------------------------------------------------
-- 1. Reference / lookup tables
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS programs (
  id           bigserial PRIMARY KEY,
  name         text        NOT NULL,
  description  text,
  tracks       integer     DEFAULT 0,
  courses      integer     DEFAULT 0,
  avg_class_size integer   DEFAULT 0,
  status       text        NOT NULL DEFAULT 'Active', -- 'Active' | 'Archived'
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- "Blocks / Sections" in the UI
CREATE TABLE IF NOT EXISTS sections (
  id           bigserial PRIMARY KEY,
  program_id   bigint      NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  term         text,                 -- e.g. 'Fall 2025'
  students_estimated integer DEFAULT 0,
  essays_estimated   integer DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, name, term)
);

-- Optional: teachers profile table (can be linked to auth.users later)
CREATE TABLE IF NOT EXISTS teachers (
  id           bigserial PRIMARY KEY,
  auth_user_id uuid UNIQUE,          -- references auth.users.id (optional)
  email        text UNIQUE,
  full_name    text,
  role         text NOT NULL DEFAULT 'teacher',  -- 'teacher' | 'admin'
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2. Students
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           bigserial PRIMARY KEY,
  student_code text        NOT NULL,          -- e.g. 'STU009'
  first_name   text        NOT NULL,
  middle_name  text,
  last_name    text        NOT NULL,
  full_name    text        GENERATED ALWAYS AS (
    trim(both ' ' from (
      first_name || ' ' || coalesce(middle_name || ' ', '') || last_name
    ))
  ) STORED,
  email        text,
  program_id   bigint      REFERENCES programs(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_code)
);

--------------------------------------------------------------------------------
-- 3. Rubrics
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rubrics (
  id           bigserial PRIMARY KEY,
  name         text        NOT NULL,
  description  text,
  -- You can either normalize criteria to another table or keep as JSON.
  criteria     jsonb,                      -- optional: list of criteria / weights
  created_by   bigint REFERENCES teachers(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. Essay activities (assignments configured by teacher)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_activities (
  id           bigserial PRIMARY KEY,
  teacher_id   bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  -- Target scope (can be NULL for "all")
  program_id   bigint      REFERENCES programs(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  rubric_id    bigint      REFERENCES rubrics(id) ON DELETE SET NULL,
  due_date     date,
  instructions text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 5. Essay submissions (per student, per activity)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essays (
  id           bigserial PRIMARY KEY,
  student_id   bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id   bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  activity_id  bigint      REFERENCES essay_activities(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  content      text,                       -- optional: raw essay text
  file_path    text,                       -- Supabase Storage path or URL
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'submitted'
               CHECK (status IN ('submitted', 'analyzed', 'reviewed')),

  -- AI analysis scores (match frontend Essay type fields)
  grammar_score           numeric,
  readability_score       numeric,
  coherence_score         numeric,
  argument_strength_score numeric,
  overall_score           numeric,

  -- Rich analysis data as JSON blobs (optional but powerful)
  grammar_errors   jsonb,
  style_issues     jsonb,
  argument_analysis jsonb,

  -- Raw combined analysis / diagnostics, if you want to store full payloads
  analysis_payload jsonb
);

--------------------------------------------------------------------------------
-- 6. Helper views (optional)
--------------------------------------------------------------------------------

-- Example: quick overview for the dashboard (similar to DashboardStats)
CREATE OR REPLACE VIEW v_teacher_dashboard_stats AS
SELECT
  t.id                                        AS teacher_id,
  COUNT(DISTINCT e.id)                        AS total_essays,
  COUNT(DISTINCT sct.id)                      AS total_classes,
  COUNT(DISTINCT st.id)                       AS total_students
FROM teachers t
LEFT JOIN essays          e   ON e.teacher_id = t.id
LEFT JOIN students        st  ON e.student_id = st.id
LEFT JOIN sections        sct ON e.section_id = sct.id
GROUP BY t.id;



