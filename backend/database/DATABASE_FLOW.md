# EduCompose Database Flow Documentation

This document describes the database flow and relationships for the EduCompose application.

## Database Flow Diagram

```
┌─────────────────┐
│     USERS       │
│  (Teachers/     │
│    Admins)      │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────▼────┐
    │ CLASSES │
    └────┬────┘
         │
         ├──────────┬──────────┐
         │ 1:N      │ 1:N      │
         │          │          │
    ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
    │STUDENTS │ │ ESSAYS │ │ ESSAYS │
    └────┬────┘ └───┬────┘ └───┬────┘
         │          │          │
         │ 1:N      │          │
         │          │          │
         └──────────┼──────────┘
                    │
                    │ 1:N
                    │
              ┌─────▼──────────┐
              │ ANALYSIS_      │
              │ REPORTS        │
              └────────────────┘
```

## Entity Relationship Details

### 1. Users Table
**Purpose**: Stores teacher and admin accounts

**Key Fields**:
- `id` (Primary Key)
- `email` (Unique, Indexed)
- `username` (Unique, Indexed)
- `password_hash`
- `role` (teacher/admin)
- `is_active`

**Relationships**:
- One User → Many Classes (`teacher_id` in classes)
- One User → Many Essays (`teacher_id` in essays)

### 2. Classes Table
**Purpose**: Stores class/course information

**Key Fields**:
- `id` (Primary Key)
- `name`
- `description`
- `teacher_id` (Foreign Key → users.id)
- `is_active`

**Relationships**:
- Many Classes → One User (teacher)
- One Class → Many Students (`class_id` in students)
- One Class → Many Essays (`class_id` in essays)

### 3. Students Table
**Purpose**: Stores student information

**Key Fields**:
- `id` (Primary Key)
- `student_id` (Unique, Indexed)
- `full_name`
- `email` (Unique, Indexed)
- `class_id` (Foreign Key → classes.id)
- `is_active`

**Relationships**:
- Many Students → One Class
- One Student → Many Essays (`student_id` in essays)

### 4. Essays Table
**Purpose**: Stores essay submissions and NLP analysis results

**Key Fields**:
- `id` (Primary Key)
- `title`
- `content` (Text)
- `student_id` (Foreign Key → students.id)
- `teacher_id` (Foreign Key → users.id)
- `class_id` (Foreign Key → classes.id)
- `status` (submitted/analyzed/reviewed)
- `submitted_at`

**Analysis Scores**:
- `grammar_score` (0-100)
- `readability_score` (0-100)
- `coherence_score` (0-100)
- `argument_strength_score` (0-100)
- `overall_score` (0-100)

**JSONB Fields** (for detailed analysis):
- `grammar_errors` (JSON array)
- `style_issues` (JSON array)
- `argument_analysis` (JSON knowledge graph)
- `recommendations` (JSON array)

**Relationships**:
- Many Essays → One Student
- Many Essays → One User (teacher)
- Many Essays → One Class
- One Essay → Many Analysis Reports

### 5. Analysis Reports Table
**Purpose**: Stores historical analysis reports

**Key Fields**:
- `id` (Primary Key)
- `essay_id` (Foreign Key → essays.id)
- `report_type` (grammar/style/argument/comprehensive)
- `content` (Text)
- `generated_at`

**Relationships**:
- Many Analysis Reports → One Essay

## Data Flow Scenarios

### Scenario 1: Teacher Creates a Class
```
1. User (teacher) logs in
2. Teacher creates a new Class
   → Class record created with teacher_id = user.id
3. Class is now available for students and essays
```

### Scenario 2: Student Submits an Essay
```
1. Student submits essay
   → Essay record created with:
     - student_id (from Student)
     - teacher_id (from Class.teacher_id)
     - class_id (from Student.class_id)
     - status = 'submitted'
2. System analyzes essay
   → Essay record updated with:
     - Analysis scores (grammar, readability, etc.)
     - JSONB fields (errors, recommendations)
     - status = 'analyzed'
3. Teacher reviews essay
   → Essay record updated with:
     - status = 'reviewed'
   → Analysis Report created (optional)
```

### Scenario 3: Querying Student Essays
```
Query Path:
Student → Essays (filter by student_id)
  → Join with Classes (for class context)
  → Join with Users (for teacher info)
  → Join with Analysis Reports (for history)
```

### Scenario 4: Batch Analysis
```
1. Query Essays where status = 'submitted'
2. For each essay:
   - Run NLP analysis
   - Update essay scores and JSONB fields
   - Create Analysis Report
   - Update status = 'analyzed'
```

## Index Strategy

### Primary Indexes
- All primary keys (automatic)
- All foreign keys (for join performance)

### Unique Indexes
- `users.email`
- `users.username`
- `students.student_id`
- `students.email`

### Performance Indexes
- `essays.status` (for filtering by status)
- `essays.submitted_at` (for date range queries)
- `essays.overall_score` (for sorting/ranking)
- `classes.teacher_id` (for teacher's classes)
- `students.class_id` (for class roster)

### JSONB Indexes (GIN)
- `essays.grammar_errors` (for querying specific error types)
- `essays.argument_analysis` (for knowledge graph queries)

## Query Patterns

### Common Queries

1. **Get all classes for a teacher**
   ```sql
   SELECT * FROM classes WHERE teacher_id = ? AND is_active = true;
   ```

2. **Get all students in a class**
   ```sql
   SELECT * FROM students WHERE class_id = ? AND is_active = true;
   ```

3. **Get all essays for a student**
   ```sql
   SELECT * FROM essays WHERE student_id = ? ORDER BY submitted_at DESC;
   ```

4. **Get essays pending analysis**
   ```sql
   SELECT * FROM essays WHERE status = 'submitted' ORDER BY submitted_at ASC;
   ```

5. **Get analysis reports for an essay**
   ```sql
   SELECT * FROM analysis_reports WHERE essay_id = ? ORDER BY generated_at DESC;
   ```

6. **Get top-scoring essays in a class**
   ```sql
   SELECT * FROM essays 
   WHERE class_id = ? AND overall_score IS NOT NULL 
   ORDER BY overall_score DESC 
   LIMIT 10;
   ```

## Frontend Data Flow

### Dashboard View
```
1. Frontend requests: GET /api/users/{user_id}/dashboard
2. Backend queries:
   - User's classes (WHERE teacher_id = user_id)
   - Recent essays (JOIN with classes)
   - Statistics (COUNT, AVG scores)
3. Response includes aggregated data
```

### Class Management View
```
1. Frontend requests: GET /api/classes/{class_id}
2. Backend queries:
   - Class details
   - Students in class (WHERE class_id = class_id)
   - Essays in class (WHERE class_id = class_id)
3. Response includes full class context
```

### Essay Analysis View
```
1. Frontend requests: GET /api/essays/{essay_id}
2. Backend queries:
   - Essay details
   - Student info (JOIN students)
   - Class info (JOIN classes)
   - Analysis reports (WHERE essay_id = essay_id)
3. Response includes complete essay context
```

## Performance Considerations

1. **JSONB Queries**: Use GIN indexes for efficient JSON queries
2. **Pagination**: Always paginate large result sets
3. **Eager Loading**: Use SQLAlchemy relationships to avoid N+1 queries
4. **Caching**: Consider caching frequently accessed data (class rosters, etc.)
5. **Connection Pooling**: Configured in database.py for PostgreSQL

## Migration Strategy

1. **Initial Setup**: Use `init_schema.sql` for fresh installations
2. **Updates**: Use Alembic migrations for schema changes
3. **Data Migration**: Create separate migration scripts for data transformations
4. **Rollback**: Always test downgrade paths

## Security Considerations

1. **Password Hashing**: Stored as bcrypt hashes, never plain text
2. **SQL Injection**: Use parameterized queries (SQLAlchemy handles this)
3. **Access Control**: Application-level authorization (not database-level)
4. **Data Validation**: Pydantic schemas validate input before database operations

