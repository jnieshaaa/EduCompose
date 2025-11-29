# Strict Login Validation - PostgreSQL Requirement

## Overview

The login system has been enhanced to **strictly require** that all credentials must exist in PostgreSQL before allowing login. Login attempts will be rejected if:

1. User credentials do not exist in PostgreSQL
2. Database connection fails
3. User is not found in the database
4. Password does not match the hash stored in PostgreSQL
5. User account is inactive in the database

## Key Requirements

### 1. Credentials Must Exist in PostgreSQL

**Login will ONLY succeed if:**
- The user email exists in the `users` table in PostgreSQL
- The password matches the hash stored in PostgreSQL
- The user account is active (`is_active = true`)
- The database connection is successful

### 2. Database Connection Validation

Before processing any login request, the system:
- Verifies PostgreSQL connection is active
- Tests database query capability
- Rejects login if database is unreachable

### 3. User Verification Process

The authentication process follows these strict steps:

```
1. Verify PostgreSQL connection → Reject if failed
2. Query PostgreSQL for user by email → Reject if user not found
3. Verify user account is active → Reject if inactive
4. Verify password matches database hash → Reject if no match
5. Record login activity in PostgreSQL → Accept login
```

## Implementation Details

### Authentication Service (`auth_service.py`)

The `authenticate_user` method now includes:

1. **Database Connection Check**
   ```python
   # Verify database connection first
   db.execute(text("SELECT 1"))
   ```

2. **Strict User Lookup**
   ```python
   # Query PostgreSQL - credentials MUST exist in database
   user = db.query(User).filter(User.email == credentials.email).first()
   
   # Reject if user not found
   if not user:
       raise HTTPException(...)
   ```

3. **Password Verification Against Database**
   ```python
   # Password must match hash stored in PostgreSQL
   if not self.verify_password(credentials.password, user.password_hash):
       raise HTTPException(...)
   ```

4. **Active Status Check**
   ```python
   # User must be active in database
   if not user.is_active:
       raise HTTPException(...)
   ```

### User Registration

The `create_user` method ensures:
- User is saved to PostgreSQL database
- User ID is generated and verified
- Database transaction is committed
- Registration fails if database save fails

## Error Messages

### Invalid Credentials
```
Status: 401 Unauthorized
Message: "Invalid credentials. User not found in database."
```

### Database Connection Failed
```
Status: 503 Service Unavailable
Message: "Database connection failed. Please ensure PostgreSQL is running and accessible."
```

### Password Mismatch
```
Status: 401 Unauthorized
Message: "Invalid credentials. Password does not match database record."
```

### Inactive Account
```
Status: 403 Forbidden
Message: "User account is inactive in database"
```

## Database Schema Requirements

The following tables must exist in PostgreSQL:

### `users` table
- `id` (Primary Key)
- `email` (Unique, Indexed)
- `username` (Unique)
- `full_name`
- `password_hash` (Bcrypt hashed)
- `role`
- `is_active` (Boolean)
- `created_at`

### `login_activities` table
- `id` (Primary Key)
- `user_id` (Foreign Key to users.id)
- `email` (Indexed)
- `ip_address`
- `user_agent`
- `login_success` (Boolean)
- `failure_reason`
- `login_timestamp` (Indexed)

## Usage Flow

### 1. User Registration (First Time)

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "password": "secure_password123",
  "role": "teacher"
}
```

**Result**: User is saved to PostgreSQL. User can now login.

### 2. User Login (After Registration)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password123"
}
```

**Validation Process:**
1. ✅ Verify PostgreSQL connection
2. ✅ Query PostgreSQL for user by email
3. ✅ Verify user exists in database
4. ✅ Verify password matches database hash
5. ✅ Verify user is active
6. ✅ Record login activity in PostgreSQL
7. ✅ Return access token + user info

## Testing

### Test Valid Login (Credentials in PostgreSQL)

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

**Expected**: 200 OK with access token and user info

### Test Invalid Login (Credentials NOT in PostgreSQL)

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "anypassword"
  }'
```

**Expected**: 401 Unauthorized - "Invalid credentials. User not found in database."

### Test Database Connection Failure

If PostgreSQL is down or unreachable:
**Expected**: 503 Service Unavailable - "Database connection failed..."

## Security Features

1. **No Hardcoded Users**: All users must exist in PostgreSQL
2. **No Bypass**: Database queries cannot be bypassed
3. **Connection Validation**: Login fails if database is unreachable
4. **Activity Logging**: All attempts (success/failure) are logged in PostgreSQL
5. **Password Hashing**: Passwords are bcrypt hashed before storage

## PostgreSQL Configuration

Ensure your `.env` file has:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db
```

**Important**: The login system will work with SQLite for development, but for production, use PostgreSQL for better performance and reliability.

## Migration Notes

If migrating existing users:

1. **Export users** from old system
2. **Import to PostgreSQL** using the registration endpoint or SQL scripts
3. **Verify passwords** are properly hashed (bcrypt)
4. **Test login** with imported credentials

## Troubleshooting

### "User not found in database"
- **Solution**: User must be registered first using `/api/auth/register`
- **Check**: Verify user exists in `users` table: `SELECT * FROM users WHERE email = 'user@example.com';`

### "Database connection failed"
- **Solution**: Ensure PostgreSQL is running
- **Check**: Verify DATABASE_URL in `.env` file
- **Test**: `psql -U username -d educompose_db -c "SELECT 1;"`

### "Password does not match database record"
- **Solution**: Password must match the hash stored during registration
- **Check**: User must use the same password used during registration

### "User account is inactive"
- **Solution**: Set `is_active = true` in database
- **SQL**: `UPDATE users SET is_active = true WHERE email = 'user@example.com';`

