# Database Setup Options

You have **two options** for setting up your PostgreSQL database:

## Option 1: Automatic Setup (Recommended - Easier) ✨

The `init_database.py` script will **automatically create the database** for you. You don't need to create it manually in pgAdmin.

### Steps:

1. **Set up your `.env` file** with PostgreSQL connection credentials:

   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/educompose_db
   ```

   Note: Use `postgres` as the username (or your PostgreSQL admin user)

2. **Run the initialization script**:

   ```bash
   cd backend
   python database/init_database.py
   ```

   The script will:

   - ✅ Connect to PostgreSQL using the `postgres` database
   - ✅ Create `educompose_db` if it doesn't exist
   - ✅ Create all tables (users, classes, students, essays, analysis_reports)
   - ✅ Set up indexes, constraints, and triggers

### Requirements for Option 1:

- PostgreSQL must be installed and running
- The user in `DATABASE_URL` must have permissions to create databases
- Default `postgres` database must exist (it does by default)

---

## Option 2: Manual Setup in pgAdmin (Alternative)

If you prefer to create the database manually in pgAdmin, you can do so:

### Steps:

1. **Open pgAdmin** and connect to your PostgreSQL server

2. **Create a new database**:

   - Right-click on "Databases" → "Create" → "Database..."
   - Database name: `educompose_db` (or your preferred name)
   - Owner: `postgres` (or your PostgreSQL user)
   - Click "Save"

3. **Update your `.env` file**:

   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/educompose_db
   ```

4. **Run the schema initialization**:

   ```bash
   cd backend
   python database/init_database.py
   ```

   Or use SQL directly:

   ```bash
   psql -U postgres -d educompose_db -f database/init_schema.sql
   ```

---

## Which Option Should You Choose?

### Use Option 1 (Automatic) if:

- ✅ You want the easiest setup
- ✅ You're new to PostgreSQL
- ✅ You want to get started quickly
- ✅ Your PostgreSQL user has create database permissions

### Use Option 2 (Manual) if:

- ✅ You prefer to have full control
- ✅ You want to see the database in pgAdmin first
- ✅ You're already familiar with pgAdmin
- ✅ You want to set custom database settings

---

## Quick Start (Option 1 - Recommended)

### 1. Make sure PostgreSQL is running

**Windows:**

- Check Services → PostgreSQL service should be running

**Linux/macOS:**

```bash
pg_isready
# or
sudo systemctl status postgresql
```

### 2. Create `.env` file in `backend/` directory

```env
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/educompose_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_HOST=0.0.0.0
API_PORT=8000
```

**Replace:**

- `your_postgres_password` with your actual PostgreSQL password
- `your-secret-key-here` with a secure random string

### 3. Run the initialization script

```bash
cd backend
python database/init_database.py
```

### 4. Verify in pgAdmin (Optional)

After running the script, you can verify in pgAdmin:

- Open pgAdmin
- Connect to your server
- Expand "Databases"
- You should see `educompose_db`
- Expand it → Schemas → public → Tables
- You should see: users, classes, students, essays, analysis_reports

---

## Troubleshooting

### Issue: "ERROR: Could not create database"

**Possible causes:**

1. PostgreSQL is not running
2. Wrong password in `DATABASE_URL`
3. User doesn't have permission to create databases
4. Database already exists with different owner

**Solutions:**

1. Start PostgreSQL service
2. Verify password in `.env` file
3. Use a user with superuser privileges (like `postgres`)
4. Option 2: Create database manually in pgAdmin

### Issue: "password authentication failed"

**Solution:**

1. Verify your PostgreSQL password
2. Check `pg_hba.conf` file for authentication settings
3. Make sure you're using the correct username (usually `postgres`)

### Issue: "database does not exist"

**Solution:**

- Use Option 1: Let the script create it automatically
- Or use Option 2: Create it manually in pgAdmin first

### Issue: "permission denied to create database"

**Solution:**

1. Use the `postgres` superuser account
2. Or grant CREATE DATABASE permission to your user:
   ```sql
   ALTER USER your_user WITH CREATEDB;
   ```

---

## After Setup

Once the database is set up (either option), you can:

1. **Verify tables were created**:

   ```bash
   psql -U postgres -d educompose_db -c "\dt"
   ```

2. **Start your application**:

   ```bash
   cd backend
   python start.py
   ```

3. **Run migrations** (if using Alembic):
   ```bash
   alembic -c database/alembic.ini upgrade head
   ```

---

## Summary

**You do NOT need to create the database manually in pgAdmin** if you use Option 1 (automatic setup). The script will create it for you.

**You CAN create it manually in pgAdmin** if you prefer (Option 2), but it's not required.

**Recommended**: Use Option 1 for the easiest setup! 🚀
