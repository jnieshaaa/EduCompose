# Creator-Only Access Migration Guide

This guide explains how to implement creator-only access for programs, sections, and students.

## Overview

After running these migrations, teachers will only be able to see and manage:
- Programs they created
- Sections they created  
- Students they created

## Migration Steps

### Step 1: Add created_by to Programs and Sections
Run: `supabase/add_creator_to_programs_sections.sql`

This migration:
- Adds `created_by` column to `programs` and `sections` tables
- Updates RLS policies to restrict access to creators only
- Allows teachers to delete their own programs

### Step 2: Add created_by to Students
Run: `supabase/add_creator_to_students.sql`

This migration:
- Adds `created_by` column to `students` table
- Updates RLS policies to restrict access to creators only

### Step 3: Assign Existing Records (Optional)
If you have existing records with `created_by = NULL`, they will not be visible to anyone. To assign them to a specific teacher:

**For Programs and Sections:**
Run: `supabase/assign_existing_programs_to_teacher.sql`
- Update the email address in the file to match the teacher's email

**For Students:**
Run: `supabase/assign_existing_students_to_teacher.sql`
- Update the email address in the file to match the teacher's email

## Important Notes

1. **NULL Records**: Records with `created_by = NULL` will NOT be visible to any teacher after migration
2. **New Records**: All new programs, sections, and students will automatically be tagged with the creator's teacher ID
3. **Frontend Updates**: The frontend code has been updated to automatically set `created_by` when creating new records

## Verification

After running migrations, you can verify ownership using:
- `supabase/check_program_ownership.sql` - Check program and section ownership
- `supabase/debug_teacher_auth.sql` - Debug authentication and RLS issues

## Troubleshooting

If teachers can't see their records:
1. Check that `created_by` is set correctly: Run `check_program_ownership.sql`
2. Verify teacher's `auth_user_id` matches: Run `debug_teacher_auth.sql`
3. Fix auth_user_id if needed: Run `fix_teacher_auth_user_id.sql`
