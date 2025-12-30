--------------------------------------------------------------------------------
-- 1. Reference / lookup tables
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS programs (
  id             bigserial PRIMARY KEY,
  name           text        NOT NULL,
  description    text,
  tracks         integer     DEFAULT 0,
  courses        integer     DEFAULT 0,
  avg_class_size integer     DEFAULT 0,
  status         text        NOT NULL DEFAULT 'Active',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sections (
  id                bigserial PRIMARY KEY,
  program_id        bigint      NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  term              text,
  students_estimated integer     DEFAULT 0,
  essays_estimated   integer     DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, name, term)
);

-- UPDATED: Linked to auth.users for security
CREATE TABLE IF NOT EXISTS teachers (
  id           bigserial PRIMARY KEY,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text UNIQUE,
  full_name    text,
  role         text NOT NULL DEFAULT 'teacher',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2. Students
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           bigserial PRIMARY KEY,
  student_code text        NOT NULL,
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

-- Add unique constraint on email (allows multiple NULL values but prevents duplicate non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique_idx 
ON students (email) 
WHERE email IS NOT NULL;

--------------------------------------------------------------------------------
-- 3. Rubrics
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rubrics (
  id               bigserial PRIMARY KEY,
  name             text        NOT NULL,
  description      text,
  criteria         jsonb,
  programs         jsonb        DEFAULT '[]'::jsonb,
  grading_intensity text,
  created_by       bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. Essay activities
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essay_activities (
  id           bigserial PRIMARY KEY,
  teacher_id   bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  program_id   bigint      REFERENCES programs(id) ON DELETE SET NULL,
  section_id   bigint      REFERENCES sections(id) ON DELETE SET NULL,
  rubric_id    bigint      REFERENCES rubrics(id) ON DELETE SET NULL,
  due_date     date,
  instructions text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 5. Essay submissions
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS essays (
  id                bigserial PRIMARY KEY,
  student_id        bigint      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id        bigint      REFERENCES teachers(id) ON DELETE SET NULL,
  section_id        bigint      REFERENCES sections(id) ON DELETE SET NULL,
  activity_id       bigint      REFERENCES essay_activities(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  content           text,
  file_path         text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  status            text        NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'analyzed', 'reviewed')),
  grammar_score           numeric,
  readability_score       numeric,
  coherence_score         numeric,
  argument_strength_score numeric,
  overall_score           numeric,
  grammar_errors          jsonb,
  style_issues            jsonb,
  argument_analysis       jsonb,
  analysis_payload        jsonb
);

--------------------------------------------------------------------------------
-- 6. SECURITY: ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- 7. STARTER POLICIES (Teacher Access)
-- These policies ensure a teacher can only see data related to their account.

CREATE POLICY "Teachers can manage their own profile" 
ON teachers FOR ALL USING (auth.uid() = auth_user_id);

-- Programs policies: Allow authenticated teachers to manage all programs
CREATE POLICY "Teachers can view all programs" 
ON programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create programs" 
ON programs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update programs" 
ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete programs" 
ON programs FOR DELETE TO authenticated USING (true);

-- Sections policies: Allow authenticated teachers to manage all sections
CREATE POLICY "Teachers can view all sections" 
ON sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create sections" 
ON sections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update sections" 
ON sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete sections" 
ON sections FOR DELETE TO authenticated USING (true);

-- Students policies: Allow authenticated teachers to manage all students
CREATE POLICY "Teachers can view all students" 
ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create students" 
ON students FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update students" 
ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Teachers can delete students" 
ON students FOR DELETE TO authenticated USING (true);

-- Rubrics policies: Allow authenticated teachers to manage rubrics
CREATE POLICY "Teachers can view all rubrics" 
ON rubrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create rubrics" 
ON rubrics FOR INSERT TO authenticated WITH CHECK (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

CREATE POLICY "Teachers can update their own rubrics" 
ON rubrics FOR UPDATE TO authenticated USING (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
) WITH CHECK (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

CREATE POLICY "Teachers can delete their own rubrics" 
ON rubrics FOR DELETE TO authenticated USING (
  created_by IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
  OR created_by IS NULL
);

-- Essay activities policies: Allow authenticated teachers to manage their own activities
CREATE POLICY "Teachers can view their own activities" 
ON essay_activities FOR SELECT TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can create activities" 
ON essay_activities FOR INSERT TO authenticated WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can update their own activities" 
ON essay_activities FOR UPDATE TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can delete their own activities" 
ON essay_activities FOR DELETE TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

-- Essays policies: Allow authenticated teachers to manage their own essays
CREATE POLICY "Teachers can view their own essays" 
ON essays FOR SELECT TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Teachers can update their own essays" 
ON essays FOR UPDATE TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
) WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers can delete their own essays" ON essays;
CREATE POLICY "Teachers can delete their own essays" 
ON essays FOR DELETE TO authenticated USING (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers can create essays" ON essays;
CREATE POLICY "Teachers can create essays" 
ON essays FOR INSERT TO authenticated WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE auth_user_id = auth.uid())
);