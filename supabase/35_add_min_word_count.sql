-- Migration: Add min_word_count to essay_activities table
-- This allows teachers to set custom thresholds for each assignment.

ALTER TABLE essay_activities ADD COLUMN IF NOT EXISTS min_word_count integer DEFAULT 150;

-- Maintain at least 10 words as a minimum reasonable boundary
ALTER TABLE essay_activities ADD CONSTRAINT min_word_count_check CHECK (min_word_count >= 10);
