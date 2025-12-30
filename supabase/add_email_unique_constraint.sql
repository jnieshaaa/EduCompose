-- Add unique constraint to email column in students table
-- This ensures no duplicate emails can be created
-- Note: NULL values are allowed (multiple students can have NULL email)

-- First, create a unique index on email where email is not null
-- This allows multiple NULL values but prevents duplicate non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique_idx 
ON students (email) 
WHERE email IS NOT NULL;

-- Alternatively, if you want to enforce uniqueness including NULL (only one NULL allowed),
-- you can use this instead (but the above is more common for optional fields):
-- CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique_idx 
-- ON students (COALESCE(email, ''));

-- If you want to make email required and unique (no NULLs allowed), use:
-- ALTER TABLE students 
--   ALTER COLUMN email SET NOT NULL,
--   ADD CONSTRAINT students_email_unique UNIQUE (email);

