--------------------------------------------------------------------------------
-- Migration: Add settings and institution columns to teachers table
-- This migration adds support for storing teacher settings and institution
-- information in the teachers table.
--------------------------------------------------------------------------------

-- Add institution column to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS institution text;

-- Add settings JSONB column to store teacher preferences and settings
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Create index on settings column for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_teachers_settings ON teachers USING gin (settings);

-- Comment on columns for documentation
COMMENT ON COLUMN teachers.institution IS 'The institution or organization where the teacher works';
COMMENT ON COLUMN teachers.settings IS 'JSONB object storing teacher preferences including AI assessment settings, thresholds, and rubric defaults';

