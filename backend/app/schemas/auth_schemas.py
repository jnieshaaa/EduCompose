"""
Authentication Schemas
Request/Response models for authentication
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional





class EmailVerificationRequest(BaseModel):
    email: str

class EmailVerificationResponse(BaseModel):
    message: str
    email: str


class VerifyEmailToken(BaseModel):
    token: str

class DeleteAccountRequest(BaseModel):
    verification_code: str = Field(..., min_length=4, max_length=10)





class TeacherProvisionStudentRequest(BaseModel):
    email: EmailStr
    student_code: str = Field(..., min_length=1, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(default=None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class TeacherProvisionStudentResponse(BaseModel):
    success: bool
    message: str
    created: bool
    temp_password: Optional[str] = None
    email: str
    student_code: str

class AdminDeleteUserRequest(BaseModel):
    user_id: str
