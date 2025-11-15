# PostgreSQL Database Quick Start Guide

This guide will help you quickly set up PostgreSQL for EduCompose.

## Prerequisites

1. **Install PostgreSQL**

   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)

2. **Start PostgreSQL Service**

   - Windows: Start PostgreSQL service from Services
   - macOS: `brew services start postgresql`
   - Linux: `sudo systemctl start postgresql`

3. **Verify Installation**
   ```bash
   psql --version
   ```

## Quick Setup (3 Steps)

### Step 1: Create Database User (Optional but Recommended)

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create user and database
CREATE USER educompose_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE educompose_db OWNER educompose_user;
GRANT ALL PRIVILEGES ON DATABASE educompose_db TO educompose_user;
\q
```

### Step 2: Configure Environment

Create or update your `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://educompose_user:your_secure_password@localhost:5432/educompose_db
```

### Step 3: Initialize Database

**Option A: Using Python Script (Recommended)**

```bash
cd backend
python database/init_database.py
```

**Option B: Using SQL Directly**

```bash
psql -U educompose_user -d educompose_db -f database/init_schema.sql
```

## Verify Setup

Test the connection:

```bash
psql -U educompose_user -d educompose_db -c "\dt"
```

You should see all 5 tables:

- users
- classes
- students
- essays
- analysis_reports

## Common Issues

### Issue: "psql: command not found"

**Solution**: Add PostgreSQL bin directory to your PATH

### Issue: "password authentication failed"

**Solution**:

1. Check username/password in DATABASE_URL
2. Verify PostgreSQL authentication settings in `pg_hba.conf`

### Issue: "database does not exist"

**Solution**: Run Step 1 to create the database

### Issue: "permission denied"

**Solution**: Ensure the user has proper permissions (see Step 1)

## Next Steps

1. Update your application to use PostgreSQL
2. Run migrations if using Alembic: `alembic -c database/alembic.ini upgrade head`
3. Test your application with the new database

## Switching from SQLite to PostgreSQL

If you're migrating from SQLite:

1. **Export SQLite Data** (if needed):

   ```bash
   sqlite3 educompose.db .dump > backup.sql
   ```

2. **Set up PostgreSQL** (follow steps above)

3. **Import Data** (if needed):

   - You may need to convert SQLite SQL to PostgreSQL format
   - Or use a migration tool

4. **Update DATABASE_URL** in `.env`

5. **Test the application**

## Production Considerations

For production deployments:

1. Use strong passwords
2. Configure SSL connections
3. Set up connection pooling
4. Enable database backups
5. Monitor database performance
6. Use read replicas for scaling (if needed)

## Need Help?

- Check `database/README.md` for detailed documentation
- Review `database/DATABASE_FLOW.md` for schema details
- Check PostgreSQL logs for errors
