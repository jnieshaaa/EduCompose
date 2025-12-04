# Migration to Supabase Auth Only

This document describes the migration from PostgreSQL password storage to Supabase Auth only.

## Changes Made

### 1. Code Changes

- **User Model** (`backend/app/models/user.py`):

  - Made `password_hash` nullable (no longer required)
  - Added comment indicating it's deprecated

- **Auth Service** (`backend/app/services/auth_service.py`):

  - `authenticate_user()`: Now uses Supabase Auth `sign_in_with_password()` instead of PostgreSQL password verification
  - `update_password()`: Only updates Supabase Auth, no longer updates PostgreSQL password_hash
  - `create_user()`: No longer stores password_hash in PostgreSQL
  - Added deprecation comments to `verify_password()` and `get_password_hash()` methods

- **Init Data Script** (`backend/init_data.py`):
  - Removed password_hash storage
  - Updated to work with Supabase Auth only

### 2. Database Schema Changes

- **Schema Files Updated**:

  - `backend/database/schemas/users.sql`: Made password_hash nullable
  - `backend/database/init_schema.sql`: Made password_hash nullable

- **Migration Script Created**:
  - `backend/database/migrations/make_password_hash_nullable.sql`: SQL script to update existing database

## Migration Steps

### Step 1: Run Database Migration

Execute the migration script on your Supabase PostgreSQL database:

```bash
# Connect to your Supabase database and run:
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f backend/database/migrations/make_password_hash_nullable.sql
```

Or run it directly in Supabase SQL Editor:

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `backend/database/migrations/make_password_hash_nullable.sql`
3. Execute the script

### Step 2: Verify Migration

After running the migration, verify that:

- `password_hash` column is now nullable in the `users` table
- Existing users can still log in (they should have Supabase Auth accounts)
- New user registration creates accounts in Supabase Auth

### Step 3: Test Authentication

1. Test login with existing users (should work via Supabase Auth)
2. Test password update (should only update Supabase Auth)
3. Test new user registration (should create in Supabase Auth)

## Important Notes

1. **Password Storage**: All passwords are now stored exclusively in Supabase Auth
2. **Authentication**: All authentication uses Supabase Auth `sign_in_with_password()`
3. **Password Updates**: Password changes only update Supabase Auth
4. **Backward Compatibility**: The `password_hash` column remains in the database but is no longer used
5. **Existing Users**: Users created before this migration should already have Supabase Auth accounts (created during registration)

## Troubleshooting

### If you get authentication errors:

1. Verify Supabase credentials in `.env`:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

2. Check that users have `supabase_user_id` set in the database

3. Verify Supabase Auth is working:
   - Go to Supabase Dashboard > Authentication > Users
   - Check if users exist there

### If migration fails:

1. Check database connection
2. Verify you have permissions to alter the table
3. Check if there are any constraints preventing the change

## Benefits

- ✅ Single source of truth for passwords (Supabase Auth)
- ✅ Better security (Supabase handles password hashing)
- ✅ Simplified codebase (no password hash management)
- ✅ Consistent authentication flow
