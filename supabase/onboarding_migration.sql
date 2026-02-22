-- Migration: Add onboarding fields to users table
-- Run this after updating the users.sql schema

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add title column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'title') THEN
        ALTER TABLE users ADD COLUMN title text;
    END IF;
    
    -- Add nickname column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'nickname') THEN
        ALTER TABLE users ADD COLUMN nickname text;
    END IF;
    
    -- Add suffix column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'suffix') THEN
        ALTER TABLE users ADD COLUMN suffix text;
    END IF;
    
    -- Add onboarding_completed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Update existing users to have onboarding_completed = true (so they don't get forced into onboarding)
-- Comment out the line below if you want existing users to go through onboarding
UPDATE users SET onboarding_completed = true WHERE onboarding_completed = false;