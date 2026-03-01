# Admin Setup Instructions

The admin functionality has been migrated to use Supabase instead of the backend API.

## Setup Steps

### 1. Run the Admin Policies Migration

In your Supabase Dashboard, go to **SQL Editor** and run the following migration file:

```sql
-- Copy and paste the contents of: supabase/03_add_admin_policies.sql
```

**Important:** This migration includes a `SECURITY DEFINER` function to prevent infinite recursion in RLS policies. The function allows the admin check to bypass RLS when querying the users table.

This will add the necessary Row Level Security (RLS) policies that allow admin users to view and manage all users.

### 2. Create an Admin User

You need to have at least one user with the `admin` role. You can either:

**Option A: Update an existing user to admin**

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Option B: Set admin role during signup**
When signing up, include the role in the user metadata.

### 3. Configure Supabase Service Role Key (For Admin Operations)

Some admin operations like deleting users and resetting passwords require the **service_role** key instead of the **anon** key.

**For Development:**
You can temporarily use the service_role key by updating `frontend/src/lib/supabaseClient.ts`:

```typescript
// For admin operations only - DO NOT use in production
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
```

**For Production:**
It's recommended to implement these sensitive operations through a secure backend endpoint that uses the service_role key server-side, with proper authentication and authorization checks.

### 4. Environment Variables

Add to your `frontend/.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
# Optional: Only if implementing admin operations client-side (not recommended for production)
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## What Changed

- ✅ Admin user management now uses Supabase directly
- ✅ All user CRUD operations (Create, Read, Update, Delete) use Supabase
- ✅ System stats are calculated from Supabase tables
- ✅ Content management (programs, activities, rubrics) uses Supabase
- ✅ Admins automatically bypass onboarding flow
- ✅ Fixed infinite recursion in RLS policies using SECURITY DEFINER function
- ❌ Backend API is no longer required for admin operations

## Current Limitations

1. **Delete User & Reset Password**: These operations currently use `supabase.auth.admin` which requires the service_role key. For production, implement these through a secure backend endpoint.

2. **Email Verified Status**: The `email_verified` field is hardcoded to `true`. To get the actual status from `auth.users`, you would need to query the auth schema (requires service_role key).

## Testing

1. Log in as an admin user
2. Navigate to Admin → User Management
3. You should see all users in the system
4. Try filtering by role and searching by email/name
5. Test updating user information
6. Test creating new users (if you have the create user modal implemented)

## Troubleshooting

### "Infinite recursion detected in policy for relation 'users'"

This error occurs when the admin policies try to query the users table, which triggers the same policies again.

**Solution:** Make sure you've run the updated `03_add_admin_policies.sql` migration that includes the `is_admin()` function with `SECURITY DEFINER`. This function bypasses RLS when checking if a user is an admin.

### Admin users being redirected to onboarding page

Admins should automatically skip the onboarding flow. This is handled in `OnboardingCheck.tsx` which checks if the user's role is 'admin' and automatically marks them as having completed onboarding.

If admins are still being redirected to onboarding:

1. Verify the user's role is set to 'admin' in the database
2. Check browser console for any errors during the onboarding check
3. Clear browser cache and try logging in again
