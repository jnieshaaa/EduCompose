# Database Schema Summary

## Overview

EduCompose uses PostgreSQL with 5 main tables organized in a hierarchical structure.

## Tables

### 1. users
**Purpose**: Teacher and admin accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEXED | User email |
| username | VARCHAR(255) | UNIQUE, NOT NULL, INDEXED | Username |
| full_name | VARCHAR(255) | NOT NULL | Full name |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt password hash |
| role | VARCHAR(50) | DEFAULT 'teacher', CHECK | Role: teacher or admin |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Update timestamp (auto) |

**Indexes**: email, username, role, is_active

### 2. classes
**Purpose**: Class/course information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | VARCHAR(255) | NOT NULL | Class name |
| description | TEXT | | Optional description |
| teacher_id | INTEGER | NOT NULL, FK → users.id | Teacher reference |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Update timestamp (auto) |
| is_active | BOOLEAN | DEFAULT TRUE | Class status |

**Indexes**: teacher_id, is_active, name

### 3. students
**Purpose**: Student information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| student_id | VARCHAR(255) | UNIQUE, NOT NULL, INDEXED | Student identifier |
| full_name | VARCHAR(255) | NOT NULL | Student full name |
| email | VARCHAR(255) | UNIQUE, INDEXED | Student email (optional) |
| class_id | INTEGER | FK → classes.id | Class reference |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Update timestamp (auto) |
| is_active | BOOLEAN | DEFAULT TRUE | Student status |

**Indexes**: student_id, email, class_id, is_active

### 4. essays
**Purpose**: Essay submissions and NLP analysis

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| title | VARCHAR(255) | NOT NULL | Essay title |
| content | TEXT | NOT NULL | Essay content |
| student_id | INTEGER | FK → students.id | Student reference |
| teacher_id | INTEGER | NOT NULL, FK → users.id | Teacher reference |
| class_id | INTEGER | FK → classes.id | Class reference |
| submitted_at | TIMESTAMP | DEFAULT NOW() | Submission timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Update timestamp (auto) |
| status | VARCHAR(50) | DEFAULT 'submitted', CHECK | Status: submitted/analyzed/reviewed |
| grammar_score | DECIMAL(5,2) | | Grammar score (0-100) |
| readability_score | DECIMAL(5,2) | | Readability score (0-100) |
| coherence_score | DECIMAL(5,2) | | Coherence score (0-100) |
| argument_strength_score | DECIMAL(5,2) | | Argument strength (0-100) |
| overall_score | DECIMAL(5,2) | | Overall composite score (0-100) |
| grammar_errors | JSONB | | Array of grammar errors |
| style_issues | JSONB | | Array of style issues |
| argument_analysis | JSONB | | Knowledge graph analysis |
| recommendations | JSONB | | AI recommendations |

**Indexes**: 
- Standard: student_id, teacher_id, class_id, status, submitted_at, overall_score
- GIN (JSONB): grammar_errors, argument_analysis

### 5. analysis_reports
**Purpose**: Historical analysis reports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| essay_id | INTEGER | NOT NULL, FK → essays.id | Essay reference |
| report_type | VARCHAR(50) | NOT NULL, CHECK | Type: grammar/style/argument/comprehensive |
| content | TEXT | NOT NULL | Report content |
| generated_at | TIMESTAMP | DEFAULT NOW() | Generation timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes**: essay_id, report_type, generated_at

## Relationships

```
users (1) ──< (N) classes
users (1) ──< (N) essays
classes (1) ──< (N) students
classes (1) ──< (N) essays
students (1) ──< (N) essays
essays (1) ──< (N) analysis_reports
```

## Foreign Key Constraints

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| classes | teacher_id | users.id | CASCADE |
| students | class_id | classes.id | SET NULL |
| essays | student_id | students.id | CASCADE |
| essays | teacher_id | users.id | CASCADE |
| essays | class_id | classes.id | SET NULL |
| analysis_reports | essay_id | essays.id | CASCADE |

## Data Types

- **SERIAL**: Auto-incrementing integer (PostgreSQL)
- **VARCHAR(n)**: Variable-length string with max length
- **TEXT**: Unlimited length text
- **BOOLEAN**: True/false values
- **TIMESTAMP**: Date and time
- **DECIMAL(5,2)**: Decimal number with 5 total digits, 2 after decimal
- **JSONB**: Binary JSON (efficient querying and indexing)

## Special Features

### Triggers
- Automatic `updated_at` timestamp updates on: users, classes, students, essays

### Constraints
- CHECK constraints for enum-like fields (role, status, report_type)
- UNIQUE constraints on email, username, student_id
- Foreign key constraints with appropriate CASCADE/SET NULL actions

### Indexes
- Primary keys (automatic)
- Foreign keys (for join performance)
- Frequently queried columns
- GIN indexes on JSONB columns (for efficient JSON queries)

## Sample Queries

### Get all classes for a teacher
```sql
SELECT * FROM classes 
WHERE teacher_id = 1 AND is_active = true;
```

### Get students in a class
```sql
SELECT * FROM students 
WHERE class_id = 1 AND is_active = true;
```

### Get essays for a student
```sql
SELECT * FROM essays 
WHERE student_id = 1 
ORDER BY submitted_at DESC;
```

### Get pending essays
```sql
SELECT * FROM essays 
WHERE status = 'submitted' 
ORDER BY submitted_at ASC;
```

### Get top essays in a class
```sql
SELECT * FROM essays 
WHERE class_id = 1 AND overall_score IS NOT NULL 
ORDER BY overall_score DESC 
LIMIT 10;
```

### Query JSONB data (grammar errors)
```sql
SELECT * FROM essays 
WHERE grammar_errors @> '[{"type": "spelling"}]'::jsonb;
```

## Migration Notes

- All tables use SERIAL for auto-incrementing IDs (PostgreSQL specific)
- JSONB columns allow efficient querying of nested JSON data
- Triggers ensure `updated_at` is always current
- Indexes are optimized for common query patterns

