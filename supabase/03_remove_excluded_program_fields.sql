-- Migration to remove excluded fields from programs table
ALTER TABLE programs 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS tracks,
DROP COLUMN IF EXISTS courses,
DROP COLUMN IF EXISTS avg_class_size,
DROP COLUMN IF EXISTS status;
