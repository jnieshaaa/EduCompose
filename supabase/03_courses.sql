--------------------------------------------------------------------------------
-- 03_courses.sql — Courses lookup + Teacher course loads
--------------------------------------------------------------------------------

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  program_id    uuid REFERENCES public.programs_lookup(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  course_code  text NOT NULL,
  course_title text NOT NULL,
  units        integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- If columns don't exist (in case table already existed)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'department_id') THEN
        ALTER TABLE public.courses ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'program_id') THEN
        ALTER TABLE public.courses ADD COLUMN program_id uuid REFERENCES public.programs_lookup(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'user_id') THEN
        ALTER TABLE public.courses ADD COLUMN user_id uuid REFERENCES public.users(auth_user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select for authenticated users' AND tablename = 'courses') THEN
        CREATE POLICY "Allow select for authenticated users" ON public.courses FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for authenticated users' AND tablename = 'courses') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.courses FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS courses_school_id_idx ON public.courses(school_id);
CREATE INDEX IF NOT EXISTS courses_department_id_idx ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS courses_program_id_idx ON public.courses(program_id);
CREATE INDEX IF NOT EXISTS courses_user_id_idx ON public.courses(user_id);

-- Teacher Course Loads
CREATE TABLE IF NOT EXISTS public.teacher_course_loads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  academic_year text,
  term          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, course_id, academic_year, term)
);

ALTER TABLE public.teacher_course_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own loads"
  ON public.teacher_course_loads FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage their loads"
  ON public.teacher_course_loads FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX IF NOT EXISTS tcl_teacher_id_idx ON public.teacher_course_loads(teacher_id);
CREATE INDEX IF NOT EXISTS tcl_course_id_idx ON public.teacher_course_loads(course_id);
