--------------------------------------------------------------------------------
-- Migration: Add teacher_course_loads table
--------------------------------------------------------------------------------

-- Create table to track courses added by teachers to their personal load
CREATE TABLE IF NOT EXISTS teacher_course_loads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  uuid NOT NULL REFERENCES users(auth_user_id) ON DELETE CASCADE,
    course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    block_id    uuid REFERENCES blocks(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(teacher_id, course_id)
);


-- Enable RLS
ALTER TABLE teacher_course_loads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own loads" 
    ON teacher_course_loads FOR SELECT 
    TO authenticated 
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can add courses to their loads" 
    ON teacher_course_loads FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can remove courses from their loads" 
    ON teacher_course_loads FOR DELETE 
    TO authenticated 
    USING (auth.uid() = teacher_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS teacher_course_loads_teacher_id_idx ON teacher_course_loads(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_course_loads_course_id_idx ON teacher_course_loads(course_id);
