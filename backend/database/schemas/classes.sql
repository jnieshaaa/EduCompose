-- Classes Table Schema
-- Stores class/course information

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE classes IS 'Stores class/course information';
COMMENT ON COLUMN classes.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN classes.name IS 'Class name';
COMMENT ON COLUMN classes.description IS 'Optional class description';
COMMENT ON COLUMN classes.teacher_id IS 'Foreign key to users table';
COMMENT ON COLUMN classes.is_active IS 'Whether the class is currently active';

