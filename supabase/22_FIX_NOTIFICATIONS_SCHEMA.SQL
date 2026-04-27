-- 22_FIX_NOTIFICATIONS_SCHEMA.SQL
-- Run this in your Supabase SQL Editor to fix the notifications table errors.

BEGIN;

-- 1. Ensure related_id column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_id') THEN
        ALTER TABLE notifications ADD COLUMN related_id uuid;
    END IF;
END $$;

-- 2. Ensure related_type column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_type') THEN
        ALTER TABLE notifications ADD COLUMN related_type text;
    END IF;
END $$;

-- 3. Ensure is_read column exists (renaming 'read' if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
        ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
    END IF;
END $$;

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
