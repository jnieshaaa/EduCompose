--------------------------------------------------------------------------------
-- Add programs column to rubrics table
-- This column stores the list of program names associated with each rubric
--------------------------------------------------------------------------------

-- Add programs column as JSONB to store array of program names
ALTER TABLE rubrics 
ADD COLUMN IF NOT EXISTS programs jsonb DEFAULT '[]'::jsonb;

-- Add grading_intensity column to store the intensity level
ALTER TABLE rubrics 
ADD COLUMN IF NOT EXISTS grading_intensity text;

-- Update existing rubrics to extract programs from criteria metadata if they exist
-- This migration handles backward compatibility
UPDATE rubrics
SET 
  programs = COALESCE(
    (criteria->>'metadata')::jsonb->'programs',
    '[]'::jsonb
  ),
  grading_intensity = COALESCE(
    (criteria->>'metadata')::jsonb->>'gradingIntensity',
    NULL
  )
WHERE criteria IS NOT NULL 
  AND criteria::text LIKE '%metadata%';

-- Add comment to document the column
COMMENT ON COLUMN rubrics.programs IS 'Array of program names (as JSONB) that this rubric is associated with';
COMMENT ON COLUMN rubrics.grading_intensity IS 'Grading intensity level: Basic, Professional, Advanced, or Technical';

