"""
Services Package
Business logic layer
"""
from .auth_service import AuthService, auth_service
from .essay_analysis_service import EssayAnalysisService, essay_analysis_service
# from .report_generator import TeacherReportGenerator
from .ocr_service import OCRService, ocr_service
from .rubric_scoring_service import RubricScoringService, rubric_scoring_service
from .copyscape_service import CopyscapeService, copyscape_service

__all__ = [
    "AuthService",
    "auth_service",
    "EssayAnalysisService",
    "essay_analysis_service",
    # "TeacherReportGenerator",
    "OCRService",
    "ocr_service",
    "RubricScoringService",
    "rubric_scoring_service",
    "CopyscapeService",
    "copyscape_service"
]

