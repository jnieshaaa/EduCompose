"""
Schemas Package
Pydantic models for request/response validation
"""
from .auth_schemas import LoginRequest, Token
from .user_schemas import UserBase, UserCreate, UserResponse
from .class_schemas import ClassBase, ClassCreate, ClassResponse
from .student_schemas import StudentBase, StudentCreate, StudentResponse
from .essay_schemas import EssayBase, EssayCreate, EssayResponse
from .analysis_schemas import (
    AnalysisRequest, 
    AnalysisResponse, 
    BatchAnalysisRequest, 
    DashboardStats,
    TextAnalysisRequest,
    TextAnalysisResponse
)

__all__ = [
    "LoginRequest",
    "Token",
    "UserBase",
    "UserCreate",
    "UserResponse",
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
    "TextAnalysisResponse"
]

