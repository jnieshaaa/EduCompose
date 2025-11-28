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
    email_verified: bool
    
    class Config:
        from_attributes = True

class EmailVerificationRequest(BaseModel):
    email: str

class EmailVerificationResponse(BaseModel):
    message: str
    email: str

class VerifyEmailToken(BaseModel):
    token: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

