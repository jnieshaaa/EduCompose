# Quick Setup Steps - What to Do Now

## Current Status
- ✅ PostgreSQL is installed and running
- ✅ .env file is configured for PostgreSQL
- ⚠️  **You need to add your PostgreSQL password**

## Step-by-Step Instructions

### Step 1: Add Your Password (DO THIS NOW)

1. The `.env` file should be open in Notepad
2. Find this line:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/educompose_db
   ```
3. Replace `YOUR_POSTGRES_PASSWORD` with your actual password
4. Save the file (Ctrl+S) and close Notepad

**Don't know your password?**
- Try: `postgres` (common default)
- Check pgAdmin if you have it installed
- Or we can help you reset it

### Step 2: Initialize Database (After you save password)

Once you've saved your password, run this command:

```powershell
py database/init_database.py
```

This will create the database and all tables.

### Step 3: Test Connection

```powershell
py -c "from app.database import engine; engine.connect(); print('✅ Connected!')"
```

### Step 4: Start Your Server

```powershell
py start.py
```

### Step 5: Test Login

1. Go to http://localhost:8000/api/docs
2. Try `/api/auth/register` to create a user
3. Try `/api/auth/login` to test login

---

## Need Help?

If you're stuck:
- **Forgot password?** We can help you find or reset it
- **Connection errors?** Check PostgreSQL service is running
- **Other issues?** Let me know what error you see

