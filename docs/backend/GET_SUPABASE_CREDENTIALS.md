# How to Get Your Supabase Credentials

Follow these steps to get all the credentials you need from your Supabase project:

## Step 1: Get Supabase URL and API Keys

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Click on **Settings** (gear icon) in the left sidebar
4. Click on **API** in the settings menu
5. You'll see:
   - **Project URL** → This is your `SUPABASE_URL`
     - Example: `https://abcdefghijklmnop.supabase.co`
   - **anon public** key → This is your `SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 2: Get Database Connection String

1. Still in your Supabase project dashboard
2. Click on **Settings** > **Database**
3. Scroll down to **Connection string** section
4. Select **URI** tab
5. Copy the connection string
   - It will look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Or: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
6. Replace `[PASSWORD]` with your actual database password
   - If you don't know your password, you can reset it in **Settings** > **Database** > **Database password**

## Step 3: Get Database Password (if needed)

1. Go to **Settings** > **Database**
2. If you need to reset or see your password, click **Reset database password**
3. Copy the password (you'll need it for the connection string)

## Step 4: Update Your .env File

Once you have all the credentials, update your `.env` file in the `backend` directory:

```env
# Database Configuration (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Security (generate a new secret key)
SECRET_KEY=your-generated-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

## Quick Reference

- **Project Reference**: The unique identifier in your Supabase URL (e.g., `abcdefghijklmnop`)
- **Database Password**: The password you set when creating the project (or reset it)
- **Anon Key**: Safe to use in frontend/client-side code
- **Service Role Key**: ⚠️ **NEVER** expose this - only use in backend/server-side code

## Need Help?

If you're having trouble finding any of these:
- Check the Supabase documentation: https://supabase.com/docs/guides/database/connecting-to-postgres
- Make sure you're logged into the correct project
- The credentials are case-sensitive, so copy them exactly

