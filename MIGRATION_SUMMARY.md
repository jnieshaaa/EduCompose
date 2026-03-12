# Migration Summary: Programs and Teachers Tables Cleanup

## Date: March 9, 2026

## Overview

Successfully updated the EduCompose application to remove references to the deleted `programs` and `teachers` tables and migrate to using `programs_lookup` and `users` tables instead.

---

## Database Changes (Supabase)

### 1. New Migration File Created

**File**: `supabase/10_cleanup_programs_teachers_tables.sql`

This migration:

- Drops old foreign key constraints referencing `programs` table
- Changes `program_id` column types from `bigint` to `uuid` in:
  - `students` table
  - `sections` table
  - `essay_activities` table
- Adds new foreign key constraints to `programs_lookup` table
- Renames `teacher_id` to `user_id` across all tables:
  - `notifications`
  - `essay_activities`
  - `essays`
  - `essay_analysis_results`
  - `essay_comparisons`
- Renames `created_by` to `user_id` in `rubrics`
- Ensures all `user_id` columns correctly reference `users(id)`
- **Refactors Blocks System**:
  - Restructures `blocks` table to use `program_id`, `year_level`, and `name` (section).
  - Removes redundant `term` and `academic_year` from `blocks`.
  - Adds `block_id` directly to `teacher_course_loads`.
  - Removes the `teaching_assignments` intermediate table.
- Sets all `program_id` values to NULL during migration (data needs to be re-mapped)

### 2. New Migration Files Created

**Files**: 
- `supabase/10_cleanup_programs_teachers_tables.sql`
- `supabase/12_replace_teacher_id_with_user_id.sql`
- `supabase/13_final_cleanup.sql` (Consolidated cleanup)
- `supabase/14_refactor_blocks_system.sql` (Blocks redesign)

**Files Updated:**

- `supabase/students.sql` - Changed `program_id bigint REFERENCES programs(id)` to `uuid REFERENCES programs_lookup(id)`
- `supabase/sections.sql` - Changed `program_id bigint REFERENCES programs(id)` to `uuid REFERENCES programs_lookup(id)`
- `supabase/essay_activities.sql` - Changed `program_id bigint REFERENCES programs(id)` to `uuid REFERENCES programs_lookup(id)`

### 3. Deprecated Old Files

**Files Deprecated:**

- `supabase/programs.sql.deprecated` - Old programs table definition
- `supabase/01_add_created_by_to_programs.sql.deprecated` - Migration for old programs table
- `supabase/03_remove_excluded_program_fields.sql.deprecated` - Migration for old programs table

### 4. Documentation Created

**Files Created:**

- `supabase/MIGRATION_PROGRAMS_TEACHERS.md` - Comprehensive migration guide with:
  - Overview of changes
  - Table-by-table breakdown
  - Migration steps for fresh and existing installations
  - Verification queries
  - Rollback instructions

---

## Backend Changes (Python/FastAPI)

### File: `backend/app/controllers/admin_controller.py`

**Changes:**

1. **System Stats Query** (Line ~365):
   - Changed: `programs?select=id&limit=1`
   - To: `programs_lookup?select=id&limit=1`

2. **Get All Programs Endpoint** (Line ~408):
   - Changed: `.from("programs").select("*")`
   - To: `.from("programs_lookup").select("*,departments(name,school_id,schools(name))")`
   - Added: Department and school joins for richer data

---

## Frontend Changes (TypeScript/React)

### 1. Services

#### `frontend/src/services/activityService.ts`

**Line ~473:**

- Changed: `.from("programs")`
- To: `.from("programs_lookup")`
- Removed: `.eq("created_by", teacherId)` filter

### 2. Hooks

#### `frontend/src/hooks/usePrograms.ts`

**Multiple changes:**

**Fetch Programs (Line ~76):**

- Changed: `.from("programs").eq("created_by", teacherId)`
- To: `.from("programs_lookup")` (no created_by filter)

**Create Programs (Line ~238):**

- Removed: `created_by: teacherId` field
- Added: `department_id: null` and `abbr` fields
- Changed: `.from("programs")` to `.from("programs_lookup")`

**Batch Import (Line ~340):**

- Removed: `created_by: teacherId` field
- Added: `department_id: null` and `abbr` fields
- Changed: `.from("programs")` to `.from("programs_lookup")`

**Delete Program (Line ~390):**

- Changed: `.from("programs")` to `.from("programs_lookup")`

**Type Definition (Line ~40):**

- Changed: `id: number` to `id: string` (for UUID support)

### 3. Components

#### `frontend/src/components/rubrics/RubricBuilderSteps.tsx`

**Line ~41:**

- Changed: `.from("programs")`
- To: `.from("programs_lookup")`

### 4. API

#### `frontend/src/api.ts`

**Two changes:**

**System Stats (Line ~661):**

- Changed: `supabase.from("programs")`
- To: `supabase.from("programs_lookup")`

**Get All Programs (Line ~692):**

- Changed: `.from("programs")`
- To: `.from("programs_lookup")`

### 5. Type Definitions

#### `frontend/src/data/programsData.ts`

**Changes:**

- `id: number` → `id: string` (for UUID)
- All sample data IDs changed from numbers to strings ('1', '2', etc.)

#### `frontend/src/hooks/usePrograms.ts`

**Type Definition:**

- `SupabaseProgramRow.id: number` → `id: string`

---

## Key Differences: programs vs programs_lookup

| Feature     | Old (programs)            | New (programs_lookup)           |
| ----------- | ------------------------- | ------------------------------- |
| Primary Key | bigint                    | uuid                            |
| Created By  | Has `created_by` field    | No `created_by` field           |
| Ownership   | Per-teacher               | Institutional                   |
| Schema      | Flat table                | Linked to departments → schools |
| Purpose     | Teacher-specific programs | School-wide program catalog     |

---

## Important Notes

### 1. Data Migration Required

⚠️ **All existing `program_id` values in students, sections, and essay_activities will be set to NULL**

You need to:

1. Run the migration script
2. Map old program IDs to new programs_lookup UUIDs
3. Update the records manually or write a data migration script

### 2. Behavior Changes

- Programs are now shared across all teachers (institutional data)
- Teachers can no longer create their own programs individually
- Programs should be managed at the school/admin level
- The `department_id` field is currently set to NULL - you should populate this properly

### 3. TODO Items in Code

Several places have `TODO: Set appropriate department_id` comments where you should:

- Either prompt users to select a department when creating programs
- Or set a default department based on the user's assigned department
- Or remove the department requirement if not needed

---

## Testing Checklist

### Database

- [ ] Run migration script `10_cleanup_programs_teachers_tables.sql`
- [ ] Verify foreign keys are updated correctly
- [ ] Check that programs_lookup has data
- [ ] Verify students/sections/essay_activities tables structure

### Backend

- [ ] Test admin dashboard stats endpoint
- [ ] Test get all programs endpoint
- [ ] Verify program data includes department/school info

### Frontend

- [ ] Test program selection in activities
- [ ] Test program management interface
- [ ] Test rubric builder program selection
- [ ] Verify program data displays correctly
- [ ] Test batch upload functionality

---

## Rollback Plan

If you need to rollback (⚠️ will lose data):

```sql
-- Revert all tables back to bigint program_id
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_program_id_lookup_fkey;
ALTER TABLE students ALTER COLUMN program_id TYPE bigint USING NULL;

ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_program_id_lookup_fkey;
ALTER TABLE sections ALTER COLUMN program_id TYPE bigint USING NULL;

ALTER TABLE essay_activities DROP CONSTRAINT IF EXISTS essay_activities_program_id_lookup_fkey;
ALTER TABLE essay_activities ALTER COLUMN program_id TYPE bigint USING NULL;
```

Then restore the old programs table schema and revert code changes.

---

## Files Modified Summary

### Supabase (SQL)

- ✅ `10_cleanup_programs_teachers_tables.sql` (NEW)
- ✅ `MIGRATION_PROGRAMS_TEACHERS.md` (NEW)
- ✅ `students.sql` (UPDATED)
- ✅ `sections.sql` (UPDATED)
- ✅ `essay_activities.sql` (UPDATED)
- ✅ `programs.sql.deprecated` (NEW)
- ✅ `01_add_created_by_to_programs.sql.deprecated` (NEW)
- ✅ `03_remove_excluded_program_fields.sql.deprecated` (NEW)

### Backend (Python)

- ✅ `app/controllers/admin_controller.py` (UPDATED)

### Frontend (TypeScript/React)

- ✅ `src/services/activityService.ts` (UPDATED)
- ✅ `src/hooks/usePrograms.ts` (UPDATED)
- ✅ `src/components/rubrics/RubricBuilderSteps.tsx` (UPDATED)
- ✅ `src/api.ts` (UPDATED)
- ✅ `src/data/programsData.ts` (UPDATED)

**Total Files Modified: 14**
**Total New Files: 4**

---

## Next Steps

1. **Run the migration**:

   ```bash
   # In Supabase SQL Editor
   # Run: supabase/10_cleanup_programs_teachers_tables.sql
   ```

2. **Populate programs_lookup** (if not already done):
   - Add institutional programs through Admin interface
   - Or run data migration from old programs table

3. **Test thoroughly**:
   - Test all program-related features
   - Verify data integrity
   - Check for any TypeScript errors

4. **Deploy**:
   - Backend changes
   - Frontend changes
   - Database migration

5. **Monitor**:
   - Check for any runtime errors
   - Verify user workflows work correctly
   - Ensure no data loss

---

## Support

For issues related to this migration:

- Check `supabase/MIGRATION_PROGRAMS_TEACHERS.md` for detailed guidance
- Review verification queries in the migration guide
- Check console logs for specific errors
