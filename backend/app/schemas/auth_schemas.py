"""
Authentication Schemas
Request/Response models for authentication
"""
from pydantic import BaseModel, Field, EmailStr
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


class TeacherRegisterRequest(BaseModel):
    """
    Payload for teacher self-registration.

    Email and password required. confirm_password optional (for backward compatibility).
    Role is implicitly set to 'teacher' by the registration endpoint.
    """
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password")
    confirm_password: Optional[str] = Field(default=None, min_length=6, description="Password confirmation (optional)")


class VerifySignupRequest(BaseModel):
    """Verify signup with 6-digit code. Password only needed for local-first flow."""
    email: str = Field(..., description="User email")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    password: Optional[str] = Field(default=None, min_length=6, description="Password (only for local-first flow)")


class ResendSignupCodeRequest(BaseModel):
    email: str = Field(..., description="User email")
