# Password Storage Confirmation

## ✅ PASSWORDS ARE STORED ONLY IN SUPABASE - NOT IN POSTGRESQL

This document confirms that all passwords are stored exclusively in Supabase Auth and NOT in PostgreSQL.

### Password Storage Locations

#### ✅ Supabase Auth (ONLY)

- **User Registration**: Passwords are created in Supabase Auth via `supabase.auth.admin.create_user()`
- **Password Updates**: Passwords are updated in Supabase Auth via `supabase.auth.admin.update_user_by_id()`
- **Password Verification**: Passwords are verified using Supabase Auth via `supabase.auth.sign_in_with_password()`

#### ❌ PostgreSQL (NOT USED)

- **password_hash column**: Exists but is always set to `NULL`
- **No password hashing**: No bcrypt or password hashing is performed for PostgreSQL
- **No password verification**: PostgreSQL password_hash is never checked during authentication

### Code Verification

#### 1. User Registration (`create_user` method)

```python
# Password created ONLY in Supabase Auth
supabase_response = supabase.auth.admin.create_user({
    "email": user_data.email,
    "password": user_data.password,  # Stored in Supabase Auth
    ...
})

# PostgreSQL user record created WITHOUT password
db_user = User(
    ...
    password_hash=None,  # ✅ Always NULL - password NOT stored
    supabase_user_id=supabase_user_id,  # Links to Supabase Auth user
    ...
)
```

#### 2. User Authentication (`authenticate_user` method)

```python
# Authentication uses Supabase Auth ONLY
supabase_response = supabase_anon.auth.sign_in_with_password({
    "email": credentials.email,
    "password": credentials.password  # Verified against Supabase Auth
})

# NO password_hash check from PostgreSQL
# PostgreSQL is only used to get user metadata (username, role, etc.)
```

#### 3. Password Update (`update_password` method)

```python
# Verify current password using Supabase Auth
supabase_anon.auth.sign_in_with_password({
    "email": current_user.email,
    "password": current_password  # Verified against Supabase Auth
})

# Update password ONLY in Supabase Auth
supabase_admin.auth.admin.update_user_by_id(
    current_user.supabase_user_id,
    {"password": new_password}  # Updated in Supabase Auth only
)

# NO PostgreSQL password_hash update
```

### Database Schema

#### User Model (`backend/app/models/user.py`)

```python
password_hash = Column(String, nullable=True)  # ✅ Nullable - always NULL
supabase_user_id = Column(String, unique=True, index=True, nullable=True)  # Links to Supabase Auth
```

#### Database Schema (`backend/database/schemas/users.sql`)

```sql
password_hash VARCHAR(255) NULL,  -- ✅ Nullable - deprecated, never used
```

### Deprecated Methods

The following methods exist but are **NEVER USED**:

- `verify_password()` - Deprecated, not called anywhere
- `get_password_hash()` - Deprecated, not called anywhere

These methods remain in the code for backward compatibility but are completely bypassed.

### Summary

✅ **ALL passwords are stored in Supabase Auth only**  
✅ **PostgreSQL password_hash is always NULL**  
✅ **Authentication uses Supabase Auth only**  
✅ **Password updates use Supabase Auth only**  
✅ **No password hashing occurs for PostgreSQL**

**PostgreSQL is ONLY used for:**

- User metadata (username, email, full_name, role)
- User relationships (classes, essays)
- Login activity logging
- NOT for password storage or authentication
