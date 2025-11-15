# PostgreSQL Setup Guide - Quick Steps

## Step 1: Verify PostgreSQL is Installed

```powershell
psql --version
```

If not installed:

- **Windows**: Download from https://www.postgresql.org/download/windows/
- During installation, remember the password you set for the `postgres` user

## Step 2: Start PostgreSQL Service

**Windows:**

- Press `Win + R`, type `services.msc`
- Find "PostgreSQL" service
- Right-click → Start (if not running)

Or check in PowerShell:

```powershell
Get-Service -Name postgresql*
```

## Step 3: Choose Setup Method

### Option A: Automatic Setup (Easiest) ⭐ Recommended

The script will automatically create the database for you!

1. **Update your `.env` file** in `backend/` directory:

   Open `.env` and change:

   ```env
   DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/educompose_db
   ```

   Replace `YOUR_POSTGRES_PASSWORD` with your actual PostgreSQL password (the one you set during installation).

2. **Run the initialization script:**

   ```powershell
   python database/init_database.py
   ```

   The script will:

   - ✅ Connect to PostgreSQL
   - ✅ Create `educompose_db` if it doesn't exist
   - ✅ Create all tables (users, classes, students, essays, analysis_reports)
   - ✅ Set up indexes, constraints, and triggers

3. **Done!** Your database is ready.

---

### Option B: Manual Setup (More Control)

1. **Connect to PostgreSQL:**

   ```powershell
   psql -U postgres
   ```

   (Enter your PostgreSQL password when prompted)

2. **Create database and user (if you want a separate user):**

   ```sql
   CREATE USER educompose_user WITH PASSWORD 'your_secure_password';
   CREATE DATABASE educompose_db OWNER educompose_user;
   GRANT ALL PRIVILEGES ON DATABASE educompose_db TO educompose_user;
   \q
   ```

3. **Update your `.env` file:**

   ```env
   DATABASE_URL=postgresql://educompose_user:your_secure_password@localhost:5432/educompose_db
   ```

   Or if using `postgres` user:

   ```env
   DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/educompose_db
   ```

4. **Initialize the schema:**

   ```powershell
   python database/init_database.py
   ```

   Or manually with SQL:

   ```powershell
   psql -U postgres -d educompose_db -f database/init_schema.sql
   ```

---

## Step 4: Verify Connection

Test that everything works:

```powershell
python -c "from app.database import engine; engine.connect(); print('✅ Database connection successful!')"
```

Or check tables:

```powershell
psql -U postgres -d educompose_db -c "\dt"
```

You should see:

- users
- classes
- students
- essays
- analysis_reports

---

## Step 5: Start Your Application

```powershell
python start.py
```

The application should now connect to PostgreSQL instead of SQLite!

---

## Common Issues

### Issue: "psql: command not found"

**Solution**: PostgreSQL bin directory is not in PATH. Add it:

- Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\14\bin` or similar)
- Add to System PATH environment variable
- Or use full path: `"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres`

### Issue: "password authentication failed"

**Solutions**:

1. Check password in `.env` matches your PostgreSQL password
2. Try resetting PostgreSQL password:
   ```powershell
   # In Windows, use pgAdmin or reset via services
   ```
3. Check `pg_hba.conf` authentication settings

### Issue: "database does not exist"

**Solution**: The init script will create it automatically, or create manually:

```sql
CREATE DATABASE educompose_db;
```

### Issue: "permission denied"

**Solution**: Ensure the user has proper permissions. Use `postgres` superuser for setup, or grant permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE educompose_db TO your_user;
```

---

## Quick Reference

**DATABASE_URL Format:**

```
postgresql://username:password@host:port/database_name
```

**Examples:**

- Default postgres user: `postgresql://postgres:mypassword@localhost:5432/educompose_db`
- Custom user: `postgresql://educompose_user:securepass@localhost:5432/educompose_db`
- Remote server: `postgresql://user:pass@db.example.com:5432/educompose_db`

---

## Next Steps

After PostgreSQL is set up:

1. ✅ Database connected
2. ✅ Tables created
3. ✅ Start application: `python start.py`
4. ✅ Test endpoints at http://localhost:8000/api/docs

For more details, see `database/README.md`
