-- Migration: Make password_hash nullable in users table
-- This migration removes the requirement for password_hash since we're using Supabase Auth only
-- Run this script on your Supabase PostgreSQL database

-- Make password_hash nullable
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN users.password_hash IS 'Deprecated: Password authentication now handled by Supabase Auth only. This field is kept for backward compatibility but is no longer used.';

