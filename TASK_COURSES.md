# Task: Add Courses to School Management

## Requirements
- Add courses under schools in SchoolManagement.tsx
- Course fields: course_code, course_title, units
- Allow admin to add/edit/delete courses
- Save to Supabase

## Implementation Plan
1. Create courses table in Supabase (if not exists)
2. Add Course interface
3. Update School interface to include courses
4. Add course management UI under each school
5. Add course modal for add/edit
6. Implement CRUD operations

## Database Schema
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  units INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
