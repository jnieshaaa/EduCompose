-- Migration: Add word_count to essays table to support dashboard highlights
-- This allows teachers to see word counts even before grading.

ALTER TABLE essays ADD COLUMN IF NOT EXISTS word_count integer;

-- Update the view to include word_count if needed
-- (Wait, we are using direct table queries mainly)

-- Also add a column for failure messages if grading fails due to rules
ALTER TABLE essays ADD COLUMN IF NOT EXISTS grading_error text;
