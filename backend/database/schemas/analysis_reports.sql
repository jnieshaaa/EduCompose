-- Analysis Reports Table Schema
-- Stores historical analysis reports

CREATE TABLE IF NOT EXISTS analysis_reports (
    id SERIAL PRIMARY KEY,
    essay_id INTEGER NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('grammar', 'style', 'argument', 'comprehensive')),
    content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_reports_essay_id ON analysis_reports(essay_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_report_type ON analysis_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_generated_at ON analysis_reports(generated_at);

-- Comments for documentation
COMMENT ON TABLE analysis_reports IS 'Stores historical analysis reports for essays';
COMMENT ON COLUMN analysis_reports.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN analysis_reports.essay_id IS 'Foreign key to essays table';
COMMENT ON COLUMN analysis_reports.report_type IS 'Type of analysis report';
COMMENT ON COLUMN analysis_reports.content IS 'Report content/text';
COMMENT ON COLUMN analysis_reports.generated_at IS 'When the report was generated';

