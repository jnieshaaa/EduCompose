-- Essays Table Schema
-- Stores essay submissions and analysis results

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_essays_student_id ON essays(student_id);
CREATE INDEX IF NOT EXISTS idx_essays_teacher_id ON essays(teacher_id);
CREATE INDEX IF NOT EXISTS idx_essays_class_id ON essays(class_id);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
CREATE INDEX IF NOT EXISTS idx_essays_submitted_at ON essays(submitted_at);
CREATE INDEX IF NOT EXISTS idx_essays_overall_score ON essays(overall_score);

-- GIN indexes for JSONB columns (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_essays_grammar_errors ON essays USING GIN (grammar_errors);
CREATE INDEX IF NOT EXISTS idx_essays_argument_analysis ON essays USING GIN (argument_analysis);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE essays IS 'Stores essay submissions and NLP analysis results';
COMMENT ON COLUMN essays.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN essays.title IS 'Essay title';
COMMENT ON COLUMN essays.content IS 'Essay content/text';
COMMENT ON COLUMN essays.student_id IS 'Foreign key to students table';
COMMENT ON COLUMN essays.teacher_id IS 'Foreign key to users table (teacher)';
COMMENT ON COLUMN essays.class_id IS 'Foreign key to classes table';
COMMENT ON COLUMN essays.status IS 'Essay processing status';
COMMENT ON COLUMN essays.grammar_score IS 'Grammar analysis score (0-100)';
COMMENT ON COLUMN essays.readability_score IS 'Readability analysis score (0-100)';
COMMENT ON COLUMN essays.coherence_score IS 'Coherence analysis score (0-100)';
COMMENT ON COLUMN essays.argument_strength_score IS 'Argument strength score (0-100)';
COMMENT ON COLUMN essays.overall_score IS 'Overall composite score (0-100)';
COMMENT ON COLUMN essays.grammar_errors IS 'JSON array of grammar errors';
COMMENT ON COLUMN essays.style_issues IS 'JSON array of style issues';
COMMENT ON COLUMN essays.argument_analysis IS 'JSON knowledge graph analysis';
COMMENT ON COLUMN essays.recommendations IS 'JSON array of AI recommendations';

