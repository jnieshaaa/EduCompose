-- Add UNIQUE constraint to the programs.name column
-- This ensures that duplicate program names cannot be inserted at the database level
-- even if the frontend validation fails

-- First, check if there are any duplicate names and handle them
-- (You may want to clean up duplicates before adding the constraint)

-- Option 1: If you want to keep only the first occurrence of each program name
-- and delete duplicates, uncomment and run this first:
/*
WITH ranked_programs AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id) as rn
  FROM programs
)
DELETE FROM programs
WHERE id IN (
  SELECT id FROM ranked_programs WHERE rn > 1
);
*/

-- Option 2: If you want to keep all existing programs but prevent future duplicates,
-- you can add a unique index on the lowercased and trimmed name instead:
-- This allows existing duplicates but prevents new ones

-- Add unique constraint on the name column (case-insensitive)
-- This will prevent duplicate program names regardless of case
CREATE UNIQUE INDEX IF NOT EXISTS programs_name_unique_idx 
ON programs (LOWER(TRIM(name)));

-- Alternative: If you want a strict unique constraint on the exact name (case-sensitive):
-- ALTER TABLE programs ADD CONSTRAINT programs_name_unique UNIQUE (name);

-- Note: The unique index on LOWER(TRIM(name)) is recommended because:
-- 1. It's case-insensitive (prevents "BS Computer Science" and "bs computer science")
-- 2. It ignores leading/trailing whitespace
-- 3. It's more user-friendly

