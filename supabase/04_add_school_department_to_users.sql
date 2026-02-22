--------------------------------------------------------------------------------
-- Add school and department to users table
--------------------------------------------------------------------------------

-- Add columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'school') THEN
        ALTER TABLE users ADD COLUMN school text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department text;
    END IF;
END $$;
