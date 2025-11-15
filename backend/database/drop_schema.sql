-- EduCompose PostgreSQL Database Drop Script
-- WARNING: This will delete all tables and data!
-- Use with caution, only for development/testing

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS analysis_reports CASCADE;
DROP TABLE IF EXISTS essays CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

