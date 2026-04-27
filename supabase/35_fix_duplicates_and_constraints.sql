-- ==========================================
-- 35_FIX_DUPLICATES_AND_CONSTRAINTS.SQL
-- Purpose: Cleanup duplicate records and enforce unique constraints
-- ==========================================

BEGIN;

-- 1. CLEANUP DUPLICATE BLOCKS
-- Keep the latest one based on created_at
DELETE FROM blocks a
USING blocks b
WHERE a.id < b.id
  AND a.program_load_id = b.program_load_id
  AND a.year = b.year
  AND a.name = b.name;

-- Add Unique Constraint to Blocks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_block_per_load') THEN
        ALTER TABLE public.blocks ADD CONSTRAINT unique_block_per_load UNIQUE (program_load_id, year, name);
    END IF;
END $$;


-- 2. CLEANUP DUPLICATE TEACHER COURSE LOADS
DELETE FROM teacher_course_loads a
USING teacher_course_loads b
WHERE a.id < b.id
  AND a.teacher_id = b.teacher_id
  AND a.course_id = b.course_id
  AND a.academic_year IS NOT DISTINCT FROM b.academic_year
  AND a.term IS NOT DISTINCT FROM b.term;

-- Add Unique Constraint to Teacher Course Loads
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_teacher_course_load') THEN
        ALTER TABLE public.teacher_course_loads ADD CONSTRAINT unique_teacher_course_load UNIQUE (teacher_id, course_id, academic_year, term);
    END IF;
END $$;


-- 3. CLEANUP DUPLICATE TEACHER PROGRAM LOADS
DELETE FROM teacher_program_loads a
USING teacher_program_loads b
WHERE a.id < b.id
  AND a.course_load_id = b.course_load_id
  AND a.program_id = b.program_id;

-- Add Unique Constraint to Teacher Program Loads
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_teacher_program_load') THEN
        ALTER TABLE public.teacher_program_loads ADD CONSTRAINT unique_teacher_program_load UNIQUE (course_load_id, program_id);
    END IF;
END $$;

COMMIT;
