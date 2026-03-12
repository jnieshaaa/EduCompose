# Supabase Schema Migration: Programs and Teachers Tables Removal

## Overview

This document explains the removal of the `programs` and `teachers` tables and the schema changes made to accommodate this.

## Changes Made

### 1. Deleted Tables

- **`programs`**: Replaced by `programs_lookup` table (defined in `05_school_management.sql`)
- **`teachers`**: Replaced by `users` table with role='teacher' (defined in `00_setup_all.sql`)

### 2. Updated Tables

#### **students** table

- **Changed**: `program_id` column
  - **Before**: `bigint REFERENCES programs(id)`
  - **After**: `uuid REFERENCES programs_lookup(id)`
- **File**: `students.sql`

#### **sections** table

- **Changed**: `program_id` column
  - **Before**: `bigint NOT NULL REFERENCES programs(id)`
  - **After**: `uuid REFERENCES programs_lookup(id)` (nullable now)
- **File**: `sections.sql`

#### **essay_activities** table

- **Changed**: `program_id` column
  - **Before**: `bigint REFERENCES programs(id)`
  - **After**: `uuid REFERENCES programs_lookup(id)`
- **Changed**: `teacher_id` column
  - **Before**: `teacher_id bigint REFERENCES users(id)`
  - **After**: `user_id bigint REFERENCES users(id)`
- **File**: `essay_activities.sql`

#### **essays**, **notifications**, **essay_analysis_results**, **essay_comparisons** tables

- **Changed**: Renamed `teacher_id` to `user_id`
- **Changed**: All policies updated to use `user_id`
- **Verified**: References `users(id)` (bigserial)

#### **rubrics** table

- **Changed**: Renamed `created_by` to `user_id`
- **Note**: Contains a `programs` JSONB column (not a foreign key)
- This is just data storage and doesn't have FK constraints
- Application code should be updated to use `programs_lookup` UUIDs
- **File**: `rubrics.sql`

### 3. New Migration Files

**`10_cleanup_programs_teachers_tables.sql`**
- Drops old foreign key constraints for programs
- Changes column types from `bigint` to `uuid` for program_id

**`12_replace_teacher_id_with_user_id.sql`**
- Renames teacher_id to user_id in notifications and essay_activities

**`13_final_cleanup.sql`**
- Renames remaining teacher_id/created_by columns to user_id
- Consolidates all RLS policy updates

### 4. Related Tables (Already Correct)

#### **programs_lookup** table

- Created in `05_school_management.sql`
- Uses `uuid` as primary key
- Links to `departments` table
- Contains school programs structure

#### **users** table

- Created in `00_setup_all.sql`
- Replaces old `teachers` table functionality
- Uses `role` column to differentiate user types

### 5. Deprecated Files

The following files reference the old `programs` table and should be reviewed or removed:

- `programs.sql` → Renamed to `programs.sql.deprecated`
- `01_add_created_by_to_programs.sql` → References old programs table
- `03_remove_excluded_program_fields.sql` → References old programs table

## Migration Steps

### For Fresh Installation:

1. Run `00_setup_all.sql` (creates users table)
2. Run `05_school_management.sql` (creates programs_lookup, schools, departments)
3. Run `students.sql`, `sections.sql`, `essay_activities.sql` (updated with uuid references)
4. Run other table creation scripts as needed

### For Existing Database:

1. **Backup your database first!**
2. Run `10_cleanup_programs_teachers_tables.sql`
3. **Note**: This migration will set all `program_id` values to NULL as the data type changes from bigint to uuid
4. You'll need to manually re-map programs to students/sections/activities using the new `programs_lookup` UUIDs

## Application Code Changes Required

### Frontend/Backend Changes:

1. **API calls**: Update any code that queries or references the `programs` table to use `programs_lookup`
2. **Type definitions**: Change `program_id` types from `number` to `string` (UUID)
3. **Rubrics**: Update code that stores program IDs in the rubrics.programs JSONB field to use UUID strings
4. **Teachers**: Ensure all teacher lookups use the `users` table with `role='teacher'` filter

### Example:

```typescript
// OLD
interface Student {
  program_id: number; // references programs.id
}

// NEW
interface Student {
  program_id: string; // references programs_lookup.id (UUID)
}
```

## Verification Queries

After migration, verify the changes:

```sql
-- Check students table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'program_id';

-- Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('students', 'sections', 'essay_activities'))
  AND kcu.column_name = 'program_id';

-- Verify programs_lookup data
SELECT * FROM programs_lookup;

-- Count users with teacher role
SELECT COUNT(*) FROM users WHERE role = 'teacher';
```

## Rollback (If Needed)

If you need to rollback (though data will be lost):

```sql
-- Revert students table
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_program_id_lookup_fkey;
ALTER TABLE students ALTER COLUMN program_id TYPE bigint USING NULL;

-- Revert sections table
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_program_id_lookup_fkey;
ALTER TABLE sections ALTER COLUMN program_id TYPE bigint USING NULL;

-- Revert essay_activities table
ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS essay_activities_program_id_lookup_fkey;
ALTER TABLE essay_activities ALTER COLUMN program_id TYPE bigint USING NULL;
```

## Questions?

If you encounter issues during migration:

1. Check that `programs_lookup` table exists and has data
2. Verify all program_id columns are nullable or have defaults
3. Ensure no orphaned foreign key constraints remain
4. Check application logs for UUID parsing errors
