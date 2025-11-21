# Switch to PostgreSQL - Step by Step Guide

## Current Status ✅

- ✅ PostgreSQL is installed and running (postgresql-x64-18)
- ✅ `.env` file has been updated to use PostgreSQL
- ✅ Database initialization script is ready
- ⚠️  **You need to add your PostgreSQL password**

## Step 1: Add Your PostgreSQL Password

1. Open the `.env` file in the `backend` directory
2. Find this line:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/educompose_db
   ```
3. Replace `YOUR_POSTGRES_PASSWORD` with your actual PostgreSQL password
   - This is the password you set when you installed PostgreSQL
   - If you forgot it, you may need to reset it via pgAdmin or Windows Services
4. Save the file

**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/educompose_db
```

## Step 2: Initialize the PostgreSQL Database

Once you've updated the password, run:

```powershell
py database/init_database.py
```

This will:
- ✅ Connect to PostgreSQL
- ✅ Create the `educompose_db` database (if it doesn't exist)
- ✅ Create all tables (users, classes, students, essays, analysis_reports)
- ✅ Set up indexes, constraints, and triggers

## Step 3: Test the Connection

Verify that everything works:

```powershell
py -c "from app.database import engine; engine.connect(); print('✅ Database connection successful!')"
```

If you see "✅ Database connection successful!", you're all set!

## Step 4: Restart Your Server

Stop your current server (if running) and start it again:

```powershell
py start.py
```

Or:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 5: Test Login Functionality

1. Open http://localhost:8000/api/docs
2. Try the `/api/auth/register` endpoint to create a test user
3. Then try `/api/auth/login` to test authentication

## Troubleshooting

### Error: "password authentication failed"
- Double-check your password in `.env` matches your PostgreSQL password
- Try connecting manually to verify: Open pgAdmin and try to connect

### Error: "database does not exist"
- The init script should create it automatically
- If not, the script will show an error message

### Error: "could not connect to server"
- Make sure PostgreSQL service is running:
  ```powershell
  Get-Service -Name postgresql*
  ```
- If not running, start it via Windows Services (services.msc)

### Forgot PostgreSQL Password?
1. Open pgAdmin (comes with PostgreSQL)
2. Or reset via Windows Services
3. Or reinstall PostgreSQL (last resort)

## Quick Verification

After setup, you can verify everything is working:

```powershell
# Check setup
py setup_postgres.py

# Test connection
py -c "from app.database import engine; engine.connect(); print('✅ Connected!')"
```

## What Changed?

- **Before**: Using SQLite (`sqlite:///./educompose.db`)
- **After**: Using PostgreSQL (`postgresql://postgres:password@localhost:5432/educompose_db`)

Your login functionality will now store user data in PostgreSQL instead of SQLite!

