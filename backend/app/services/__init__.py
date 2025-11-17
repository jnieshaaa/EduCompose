"""
Services Package
Business logic layer
"""
from .auth_service import AuthService, auth_service
from .essay_analysis_service import EssayAnalysisService, essay_analysis_service
from .report_generator import TeacherReportGenerator

__all__ = [
    "AuthService",
    "auth_service",
    "EssayAnalysisService",
    "essay_analysis_service",
    "TeacherReportGenerator"
]

