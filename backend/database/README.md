# EduCompose Database Setup

This directory contains PostgreSQL database schemas and migration files for the EduCompose application.

## Directory Structure

```
database/
├── schemas/                    # Individual table schema files
│   ├── users.sql
│   ├── classes.sql
│   ├── students.sql
│   ├── essays.sql
│   └── analysis_reports.sql
├── migrations/                 # Alembic migration files
│   ├── env.py
│   ├── script.py.mako
│   └── versions/              # Generated migration versions
├── init_schema.sql            # Complete schema initialization file
├── drop_schema.sql            # Schema drop script (use with caution)
├── init_database.py           # Python script to initialize database
├── alembic.ini                # Alembic configuration
└── README.md                  # This file
```

## Database Schema Overview

### Tables

1. **users** - Teacher and admin user accounts
2. **classes** - Class/course information
3. **students** - Student information
4. **essays** - Essay submissions and NLP analysis results
5. **analysis_reports** - Historical analysis reports

### Relationships

```
users (teachers/admins)
  ├── classes (one-to-many)
  │     ├── students (one-to-many)
  │     │     └── essays (one-to-many)
  │     └── essays (one-to-many)
  └── essays (one-to-many)
        └── analysis_reports (one-to-many)
```

## Setup Instructions

### Prerequisites

1. PostgreSQL installed and running
2. Python dependencies installed (`psycopg2-binary` is required)
3. Environment variables configured (see `.env` file)

### Option 1: Using the Python Initialization Script

1. Set up your `.env` file with PostgreSQL connection string:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db
   ```

2. Run the initialization script:
   ```bash
   cd backend
   python database/init_database.py
   ```

This script will:

- Create the database if it doesn't exist
- Initialize all tables with proper indexes and constraints
- Set up triggers for `updated_at` timestamps

### Option 2: Using SQL Files Directly

1. Create the database manually:

   ```bash
   createdb educompose_db
   ```

2. Run the schema initialization:
   ```bash
   psql -U username -d educompose_db -f database/init_schema.sql
   ```

### Option 3: Using Alembic Migrations (Recommended for Production)

1. Initialize Alembic (if not already done):

   ```bash
   cd backend
   alembic -c database/alembic.ini init migrations
   ```

2. Create an initial migration:

   ```bash
   alembic -c database/alembic.ini revision --autogenerate -m "Initial schema"
   ```

3. Apply migrations:
   ```bash
   alembic -c database/alembic.ini upgrade head
   ```

## Environment Configuration

Update your `.env` file with PostgreSQL connection details:

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db

# Optional: Enable SQL query logging
SQL_ECHO=false
```

### Connection String Format

```
postgresql://[user[:password]@][host][:port][/database]
```

Examples:

- Local: `postgresql://postgres:mypassword@localhost:5432/educompose_db`
- Remote: `postgresql://user:pass@db.example.com:5432/educompose_db`

## Database Features

### Indexes

All tables include appropriate indexes for:

- Foreign keys
- Frequently queried columns
- JSONB columns (GIN indexes for essays table)

### Triggers

Automatic `updated_at` timestamp updates via triggers on:

- users
- classes
- students
- essays

### Constraints

- Foreign key constraints with appropriate CASCADE/SET NULL actions
- CHECK constraints for enum-like fields (role, status, report_type)
- UNIQUE constraints on email, username, student_id

### JSONB Support

The `essays` table uses JSONB for:

- `grammar_errors`
- `style_issues`
- `argument_analysis`
- `recommendations`

This allows efficient querying and indexing of JSON data.

## Migration Management

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic -c database/alembic.ini revision --autogenerate -m "Description"

# Create empty migration
alembic -c database/alembic.ini revision -m "Description"
```

### Applying Migrations

```bash
# Apply all pending migrations
alembic -c database/alembic.ini upgrade head

# Apply specific migration
alembic -c database/alembic.ini upgrade <revision>

# Rollback one migration
alembic -c database/alembic.ini downgrade -1

# Rollback to specific revision
alembic -c database/alembic.ini downgrade <revision>
```

### Migration Status

```bash
# Check current migration status
alembic -c database/alembic.ini current

# View migration history
alembic -c database/alembic.ini history
```

## Schema Files

### Individual Schema Files

Each table has its own schema file in `schemas/`:

- Can be used for reference
- Can be applied individually if needed
- Include comments and documentation

### Complete Schema File

`init_schema.sql` contains the complete database schema:

- All tables
- All indexes
- All triggers
- All constraints
- Relationship documentation

## Dropping the Schema

⚠️ **WARNING**: This will delete all data!

```bash
psql -U username -d educompose_db -f database/drop_schema.sql
```

Or use the Python script:

```bash
python database/drop_schema.py  # (if created)
```

## Troubleshooting

### Connection Issues

1. Verify PostgreSQL is running:

   ```bash
   pg_isready
   ```

2. Check connection string format
3. Verify user permissions
4. Check firewall/network settings

### Migration Issues

1. Ensure all models are imported in `migrations/env.py`
2. Check for conflicting migrations
3. Review migration files for syntax errors

### Schema Issues

1. Verify all foreign key relationships are correct
2. Check for circular dependencies
3. Ensure all required indexes are created

## Best Practices

1. **Always use migrations** for production deployments
2. **Backup your database** before running migrations
3. **Test migrations** in a development environment first
4. **Review auto-generated migrations** before applying
5. **Use transactions** for data migrations
6. **Document custom migrations** with clear comments

## Support

For issues or questions:

1. Check the main README.md
2. Review the MVC_STRUCTURE.md documentation
3. Check Alembic documentation: https://alembic.sqlalchemy.org/
