# Migrating to Supabase (Store All Data in Supabase)

This guide helps you switch from SQLite to Supabase for all backend data.

## Prerequisites

- Supabase project at [app.supabase.com](https://app.supabase.com)
- Your project must match the `SUPABASE_URL` in `.env` (e.g. `xqsocwbexodcdmvkoupm`)

## Step 1: Run SQL Migrations in Supabase

In **Supabase Dashboard → SQL Editor**, run these scripts (if not already run):

1. **Core schema** (if needed): `supabase/users.sql`, `supabase/triggers.sql`, `supabase/programs.sql`, `supabase/sections.sql`, etc.
2. **Signup verification codes** (required for new sign-up flow):

```sql
-- Run supabase/signup_verification_codes.sql
CREATE TABLE IF NOT EXISTS signup_verification_codes (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signup_verification_codes_email_idx ON signup_verification_codes(email);
CREATE INDEX IF NOT EXISTS signup_verification_codes_expires_idx ON signup_verification_codes(expires_at);
```

## Step 2: Get Your Supabase Database Connection String

1. Go to **Supabase Dashboard** → **Project Settings** (gear icon) → **Database**
2. Under **Connection string**, choose **URI**
3. Copy the connection string, e.g.:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   Or the direct connection:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password (from the same page)
5. **Important:** Use the connection string for the **same project** as `SUPABASE_URL`
   - If `SUPABASE_URL=https://xqsocwbexodcdmvkoupm.supabase.co`, the host must be `db.xqsocwbexodcdmvkoupm.supabase.co`

## Step 3: Update `backend/.env`

Your `.env` has been updated with a `DATABASE_URL` template. **Replace `YOUR_DB_PASSWORD`** with your Supabase database password:

- Go to **Supabase Dashboard** → **Project Settings** → **Database**
- Find **Database password** (or reset it if needed)
- In `backend/.env`, replace `YOUR_DB_PASSWORD` in the `DATABASE_URL` line

Example (with real password):

```env
DATABASE_URL=postgresql://postgres:your_actual_password@db.xqsocwbexodcdmvkoupm.supabase.co:5432/postgres
```

## Step 4: Restart the Backend

After updating `.env`, restart the backend server. On startup it will:

- Connect to Supabase Postgres
- Create any missing tables (e.g. `signup_verification_codes`) via `create_all`

## How It Works Now

| Action           | Behavior                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Sign up**      | User is created in Supabase Auth; trigger creates row in `public.users`; 6-digit code stored in `signup_verification_codes` |
| **Verify code**  | Code is checked in `signup_verification_codes`; user is already in Supabase                                                 |
| **Login**        | Uses Supabase Auth; no local users table for auth                                                                           |
| **All app data** | Stored in Supabase when `DATABASE_URL` points to Supabase                                                                   |

## Troubleshooting

- **"could not translate host name"** – Check that `DATABASE_URL` uses the correct host for your project (e.g. `db.xqsocwbexodcdmvkoupm.supabase.co` for project `xqsocwbexodcdmvkoupm`).
- **"Email already registered"** – For Supabase-first flow, this is checked against Supabase Auth, not a local DB.
- **Connection refused / timeout** – Ensure your Supabase project is not paused and your IP is allowed (Supabase allows all by default; verify in Dashboard → Database → Connection pooling).
