"""
Student Schemas
Request/Response models for student management
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: Optional[str] = None

class StudentCreate(StudentBase):
    class_id: int

class StudentResponse(StudentBase):
    id: int
    class_id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

