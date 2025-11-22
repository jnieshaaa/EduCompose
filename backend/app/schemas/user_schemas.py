"""
User Schemas
Request/Response models for user management
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str = "teacher"

class UserCreate(BaseModel):
    email: str
    password: str
    # username and full_name will be auto-generated from email if not provided
    username: Optional[str] = None
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

