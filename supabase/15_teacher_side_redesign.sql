--------------------------------------------------------------------------------
-- Migration: Teacher-Specific Data Model Redesign
--------------------------------------------------------------------------------

-- 1. Refactor teacher_course_loads
-- Ensure block_id is removed as per requirement
-- restored academic_year and term as they are required for archiving
ALTER TABLE IF EXISTS teacher_course_loads DROP COLUMN IF EXISTS block_id;
ALTER TABLE IF EXISTS teacher_course_loads ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE IF EXISTS teacher_course_loads ADD COLUMN IF NOT EXISTS term text;

-- 2. Create teacher_program_loads
CREATE TABLE IF NOT EXISTS teacher_program_loads (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_load_id  uuid NOT NULL REFERENCES teacher_course_loads(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs_lookup(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(course_load_id, program_id)
);

-- 3. Refactor blocks
-- Re-defining blocks to link to teacher_program_loads
DROP TABLE IF EXISTS block_students CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;

CREATE TABLE blocks (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_load_id  uuid NOT NULL REFERENCES teacher_program_loads(id) ON DELETE CASCADE,
    year             integer NOT NULL CHECK (year BETWEEN 1 AND 5),
    name             text NOT NULL, -- e.g., 'A', 'B', 'C'
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE(program_load_id, year, name)
);

-- 4. Update students table
-- Ensure it has the required columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS block_name text;

-- 5. Create block_students (Re-create after block refactor)
CREATE TABLE block_students (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id    uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    student_id  bigint NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(block_id, student_id)
);

--------------------------------------------------------------------------------
-- RLS POLICIES (Strict Isolation)
--------------------------------------------------------------------------------

-- Enable RLS on new/refactored tables
ALTER TABLE teacher_program_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 1. teacher_program_loads: Filter by teacher_id in teacher_course_loads
CREATE POLICY "Teachers can manage their own program loads"
    ON teacher_program_loads
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM teacher_course_loads
            WHERE id = teacher_program_loads.course_load_id
            AND teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teacher_course_loads
            WHERE id = teacher_program_loads.course_load_id
            AND teacher_id = auth.uid()
        )
    );

-- 2. blocks: Filter by teacher_id through teacher_program_loads and teacher_course_loads
CREATE POLICY "Teachers can manage their own blocks"
    ON blocks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM teacher_program_loads tpl
            JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
            WHERE tpl.id = blocks.program_load_id
            AND tcl.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teacher_program_loads tpl
            JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
            WHERE tpl.id = blocks.program_load_id
            AND tcl.teacher_id = auth.uid()
        )
    );

-- 3. students: Filter by program_id and potentially others, but let's base it on block membership for visibility
-- Actually, the user says: "Each teacher should only see their own data."
-- "students created by Teacher1 will never appear in Teacher2’s dashboard."
-- So we need a teacher_id on students, OR derive it from block_students.
-- If a student is in a block owned by Teacher X, then Teacher X can see them.
-- But students can be created without a block (the modal saves auto-filled data though).
-- Let's add teacher_id to students for the most reliable filtering.
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES users(auth_user_id) ON DELETE CASCADE;

CREATE POLICY "Teachers can manage their own students"
    ON students
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- 4. block_students: Derived isolation
CREATE POLICY "Teachers can manage their block_students"
    ON block_students
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM blocks b
            JOIN teacher_program_loads tpl ON b.program_load_id = tpl.id
            JOIN teacher_course_loads tcl ON tpl.course_load_id = tcl.id
            WHERE b.id = block_students.block_id
            AND tcl.teacher_id = auth.uid()
        )
    );

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_tpl_course_load_id ON teacher_program_loads(course_load_id);
CREATE INDEX IF NOT EXISTS idx_blocks_program_load_id ON blocks(program_load_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bs_block_id ON block_students(block_id);
CREATE INDEX IF NOT EXISTS idx_bs_student_id ON block_students(student_id);
