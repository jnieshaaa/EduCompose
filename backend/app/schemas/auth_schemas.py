"""
Authentication Schemas
Request/Response models for authentication
"""
from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

