-- 17_ADD_ANALYSIS_PAYLOAD.SQL
-- Purpose: Add missing analysis_payload column to essays table for backward compatibility
-- This resolves the 400 Bad Request error in activityService.ts

BEGIN;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='essays' AND column_name='analysis_payload') THEN
        ALTER TABLE essays ADD COLUMN analysis_payload jsonb;
    END IF;
END $$;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
