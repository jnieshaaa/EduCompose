"""
Schemas Package
Pydantic models for request/response validation
"""
from .auth_schemas import (
    LoginRequest,
    Token,
    LoginResponse,
    UserInfo,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailToken,
    DeleteAccountRequest,
    CheckEmailRequest,
    CheckEmailResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TeacherRegisterRequest,
    VerifySignupRequest,
    ResendSignupCodeRequest,
)
from .user_schemas import (
    UserBase,
    UserCreate,
    UserResponse,
    PasswordUpdate,
    UserUpdate
)
from .class_schemas import ClassBase, ClassCreate, ClassResponse
from .student_schemas import StudentBase, StudentCreate, StudentResponse
from .essay_schemas import EssayBase, EssayCreate, EssayResponse
from .analysis_schemas import (
    AnalysisRequest,
    AnalysisResponse,
    BatchAnalysisRequest,
    DashboardStats,
    TextAnalysisRequest,
    TextAnalysisResponse,
    PlagiarismCheckRequest,
    PlagiarismCheckResponse,
    PlagiarismMatch
)
from .comparison import ComparisonAnalysisRequest, ComparisonAnalysisResponse

__all__ = [
    "LoginRequest",
    "Token",
    "LoginResponse",
    "UserInfo",
    "EmailVerificationRequest",
    "EmailVerificationResponse",
    "VerifyEmailToken",
    "DeleteAccountRequest",
    "CheckEmailRequest",
    "CheckEmailResponse",
    "ResetPasswordRequest",
    "ResetPasswordResponse",
    "TeacherRegisterRequest",
    "VerifySignupRequest",
    "ResendSignupCodeRequest",
    "UserBase",
    "UserCreate",
    "UserResponse",
    "PasswordUpdate",
    "UserUpdate",
    "ClassBase",
    "ClassCreate",
    "ClassResponse",
    "StudentBase",
    "StudentCreate",
    "StudentResponse",
    "EssayBase",
    "EssayCreate",
    "EssayResponse",
    "AnalysisRequest",
    "AnalysisResponse",
    "BatchAnalysisRequest",
    "DashboardStats",
    "TextAnalysisRequest",
    "TextAnalysisResponse",
    "PlagiarismCheckRequest",
    "PlagiarismCheckResponse",
    "PlagiarismMatch",
    "ComparisonAnalysisRequest",
    "ComparisonAnalysisResponse",
]
