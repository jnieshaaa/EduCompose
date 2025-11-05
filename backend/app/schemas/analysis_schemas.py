"""
Analysis Schemas
Request/Response models for essay analysis
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from .essay_schemas import EssayResponse

class AnalysisRequest(BaseModel):
    essay_id: int
    analysis_type: str = "comprehensive"  # grammar, readability, coherence, argument, comprehensive

class DiagnosticRecommendation(BaseModel):
    priority: str  # high, medium, low
    dimension: str
    message: str
    suggestion: str
    action_items: Optional[List[str]] = []

class DiagnosticSummary(BaseModel):
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    critical_issues: List[str]
    dimension_scores: Dict[str, float]

class AnalysisResponse(BaseModel):
    essay_id: int
    analysis_type: str
    scores: Dict[str, float]
    detailed_analysis: Dict[str, Any]
    recommendations: List[Dict[str, Any]]  # List of DiagnosticRecommendation dicts
    diagnostic_summary: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None
    generated_at: datetime

class BatchAnalysisRequest(BaseModel):
    essay_ids: List[int]
    analysis_type: str = "comprehensive"

class DashboardStats(BaseModel):
    total_essays: int
    total_classes: int
    total_students: int
    recent_essays: List[EssayResponse]
    class_stats: List[Dict[str, Any]]

