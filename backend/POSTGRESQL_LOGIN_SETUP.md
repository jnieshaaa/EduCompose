# PostgreSQL Login Setup - Quick Start Guide

## Step 1: Get Your PostgreSQL Password

You need the password you set when installing PostgreSQL. If you forgot it:

**Option A: Try the default/common passwords:**
- `postgres` (common default)
- The password you set during installation

**Option B: Reset it (if needed):**
1. Open pgAdmin (comes with PostgreSQL)
2. Or use Windows Services to reset

## Step 2: Update Your .env File

Open `backend/.env` and update the `DATABASE_URL` line:

```env
# Change this line:
DATABASE_URL=sqlite:///./educompose.db

# To this (replace YOUR_PASSWORD with your actual PostgreSQL password):
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/educompose_db
```

**Example:**
```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/educompose_db
```

## Step 3: Initialize the Database

Run this command in the `backend` directory:

```powershell
python database/init_database.py
```

This will:
- ✅ Create the `educompose_db` database (if it doesn't exist)
- ✅ Create all tables (users, classes, students, essays, analysis_reports)
- ✅ Set up indexes and triggers

## Step 4: Test the Connection

```powershell
python -c "from app.database import engine; engine.connect(); print('✅ Database connection successful!')"
```

## Step 5: Start Your Server

```powershell
python start.py
```

Or:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 6: Test Login Endpoint

1. Open http://localhost:8000/api/docs
2. Try the `/api/auth/register` endpoint to create a test user
3. Then try `/api/auth/login` to test authentication

## Troubleshooting

### Error: "password authentication failed"
- Check your password in `.env` matches your PostgreSQL password
- Try connecting manually: `psql -U postgres` (enter password when prompted)

### Error: "database does not exist"
- The init script should create it automatically
- If not, create manually: `psql -U postgres -c "CREATE DATABASE educompose_db;"`

### Error: "psql: command not found"
- PostgreSQL bin directory not in PATH
- Use full path: `"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres`

### Error: "could not connect to server"
- Make sure PostgreSQL service is running: `Get-Service postgresql*`
- Start it if needed via Windows Services (services.msc)

## Next Steps

After setup is complete:
1. ✅ Database is ready
2. ✅ You can register users via `/api/auth/register`
3. ✅ You can login via `/api/auth/login`
4. ✅ JWT tokens will be generated for authenticated users

