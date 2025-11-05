"""
Class Schemas
Request/Response models for class management
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClassCreate(ClassBase):
    pass

class ClassResponse(ClassBase):
    id: int
    teacher_id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

