# Supabase Integration Setup Guide

This guide will help you set up Supabase for email verification and database in EduCompose.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the following values:
   - **Project URL** (SUPABASE_URL)
   - **anon/public key** (SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - Keep this secret!

4. Navigate to **Settings** > **Database**
5. Under **Connection string**, select **URI** and copy the connection string
   - This is your `DATABASE_URL`
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   # Database Configuration (Supabase PostgreSQL)
   DATABASE_URL=postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres

   # Supabase Configuration
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Security (keep existing values)
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30

   # API Configuration
   API_HOST=0.0.0.0
   API_PORT=8000
   ```

## Step 3: Configure Supabase Email Templates

1. Go to **Authentication** > **Email Templates** in your Supabase dashboard
2. Configure the **Confirm signup** template (optional - defaults work fine)
3. Set the **Site URL** in **Authentication** > **URL Configuration**:
   - For development: `http://localhost:5173` (or your frontend URL)
   - For production: Your production frontend URL

## Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install the `supabase` Python client.

## Step 5: Run Database Migrations

The User model has been updated to include:
- `email_verified` (Boolean) - Tracks email verification status
- `supabase_user_id` (String) - Links to Supabase Auth user

Run migrations to update your database schema:

```bash
# If using Alembic
alembic revision --autogenerate -m "Add email verification and Supabase user ID"
alembic upgrade head

# Or manually update the database schema
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

## Step 6: Test the Integration

1. Start the backend server:
   ```bash
   python start.py
   ```

2. Test registration (sends verification email):
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123"
     }'
   ```

3. Check the email inbox for the verification link

4. Verify email using the token from the email link

## API Endpoints

### Registration
- **POST** `/api/auth/register`
  - Creates user in both Supabase Auth and local database
  - Automatically sends verification email

### Send Verification Email
- **POST** `/api/auth/send-verification-email`
  - Resends verification email
  - Body: `{"email": "user@example.com"}`

### Verify Email
- **POST** `/api/auth/verify-email`
  - Verifies email using token from email link
  - Body: `{"token": "verification_token_from_email"}`

## How Email Verification Works

1. **User Registration**: 
   - User registers via `/api/auth/register`
   - Account created in Supabase Auth (unverified)
   - Account created in local PostgreSQL database
   - Verification email sent automatically by Supabase

2. **Email Verification**:
   - User clicks link in email
   - Supabase redirects to your frontend with tokens
   - Frontend extracts token and calls `/api/auth/verify-email`
   - Backend verifies token and updates `email_verified` status

3. **Resend Verification**:
   - If user didn't receive email, call `/api/auth/send-verification-email`
   - New verification email is sent

## Troubleshooting

### Email not sending
- Check Supabase **Authentication** > **Providers** > **Email** settings
- Ensure email provider is configured (Supabase uses its own SMTP by default)
- Check spam folder

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check that your Supabase project is active
- Ensure password in connection string is URL-encoded if it contains special characters

### Token verification fails
- Tokens expire after a certain time (default: 1 hour)
- Request a new verification email if token expired
- Check that token format matches what Supabase sends

## Security Notes

- **Never commit** `.env` file to version control
- **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - it has admin privileges
- Use `SUPABASE_ANON_KEY` for client-side operations only
- Service role key should only be used in backend/server-side code

## Next Steps

- Configure custom email templates in Supabase dashboard
- Set up email redirect URLs for production
- Consider implementing email verification requirement for certain actions
- Add rate limiting for email sending endpoints

