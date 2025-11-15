-- Students Table Schema
-- Stores student information

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE students IS 'Stores student information';
COMMENT ON COLUMN students.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN students.student_id IS 'Unique student identifier';
COMMENT ON COLUMN students.full_name IS 'Student full name';
COMMENT ON COLUMN students.email IS 'Student email address (optional)';
COMMENT ON COLUMN students.class_id IS 'Foreign key to classes table';
COMMENT ON COLUMN students.is_active IS 'Whether the student record is active';

