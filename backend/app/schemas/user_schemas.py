"""
User Schemas
Request/Response models for user management
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: str = "teacher"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    # username and full_name will be auto-generated from email if not provided
    username: Optional[str] = None
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class DeleteAccountRequest(BaseModel):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    email_verified: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True