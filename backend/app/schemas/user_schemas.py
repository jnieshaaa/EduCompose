"""
User Schemas
Request/Response models for user management
"""
from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str = "teacher"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

