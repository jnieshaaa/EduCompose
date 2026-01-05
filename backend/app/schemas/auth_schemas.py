"""
Authentication Schemas
Request/Response models for authentication
"""
from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    email: Optional[str] = Field(default=None, description="User email")
    username: Optional[str] = Field(default=None, description="Username (alternative to email)")
    password: str

class DeleteAccountRequest(BaseModel):
    verification_code: str = Field(..., min_length=4, max_length=10)

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

class CheckEmailRequest(BaseModel):
    email: str = Field(..., description="Email address to check")

class CheckEmailResponse(BaseModel):
    exists: bool
    message: str

class ResetPasswordRequest(BaseModel):
    email: str = Field(..., description="User email address")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")

class ResetPasswordResponse(BaseModel):
    message: str
    success: bool

