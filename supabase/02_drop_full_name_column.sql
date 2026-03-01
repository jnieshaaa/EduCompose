--------------------------------------------------------------------------------
-- Migration: Drop full_name column from users table
-- full_name is now stored in Supabase Auth user_metadata as display_name
-- This eliminates data duplication
--------------------------------------------------------------------------------

ALTER TABLE users DROP COLUMN IF EXISTS full_name;

