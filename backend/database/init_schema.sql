-- EduCompose PostgreSQL Database Initialization
-- This file creates the complete database schema
-- Run this file to initialize a fresh PostgreSQL database

-- Enable UUID extension (if needed in future)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the update_updated_at_column function first (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,  -- Deprecated: Using Supabase Auth only
    role VARCHAR(50) DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Stores teacher and admin user accounts';

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE classes IS 'Stores class/course information';

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE students IS 'Stores student information';

-- ============================================
-- ESSAYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS essays (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'analyzed', 'reviewed')),
    
    -- Analysis scores
    grammar_score DECIMAL(5, 2),
    readability_score DECIMAL(5, 2),
    coherence_score DECIMAL(5, 2),
    argument_strength_score DECIMAL(5, 2),
    overall_score DECIMAL(5, 2),
    
    -- Detailed analysis (stored as JSONB for better querying)
    grammar_errors JSONB,
    style_issues JSONB,
    argument_analysis JSONB,
    recommendations JSONB
);

CREATE INDEX IF NOT EXISTS idx_essays_student_id ON essays(student_id);
CREATE INDEX IF NOT EXISTS idx_essays_teacher_id ON essays(teacher_id);
CREATE INDEX IF NOT EXISTS idx_essays_class_id ON essays(class_id);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
CREATE INDEX IF NOT EXISTS idx_essays_submitted_at ON essays(submitted_at);
CREATE INDEX IF NOT EXISTS idx_essays_overall_score ON essays(overall_score);

-- GIN indexes for JSONB columns (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_essays_grammar_errors ON essays USING GIN (grammar_errors);
CREATE INDEX IF NOT EXISTS idx_essays_argument_analysis ON essays USING GIN (argument_analysis);

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE essays IS 'Stores essay submissions and NLP analysis results';

-- ============================================
-- ANALYSIS REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_reports (
    id SERIAL PRIMARY KEY,
    essay_id INTEGER NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('grammar', 'style', 'argument', 'comprehensive')),
    content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_essay_id ON analysis_reports(essay_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_report_type ON analysis_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_generated_at ON analysis_reports(generated_at);

COMMENT ON TABLE analysis_reports IS 'Stores historical analysis reports for essays';

-- ============================================
-- DATABASE FLOW DIAGRAM (for reference)
-- ============================================
-- 
-- users (teachers/admins)
--   ├── classes (one-to-many)
--   │     ├── students (one-to-many)
--   │     │     └── essays (one-to-many)
--   │     └── essays (one-to-many)
--   └── essays (one-to-many)
--         └── analysis_reports (one-to-many)
--
-- Relationships:
-- - User -> Classes: One teacher can have many classes
-- - Class -> Students: One class can have many students
-- - Class -> Essays: One class can have many essays
-- - Student -> Essays: One student can have many essays
-- - User -> Essays: One teacher can have many essays
-- - Essay -> AnalysisReports: One essay can have many analysis reports

