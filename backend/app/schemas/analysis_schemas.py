"""
Analysis Schemas
Request/Response models for essay analysis
"""
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
from .essay_schemas import EssayResponse

class AnalysisRequest(BaseModel):
    essay_id: int
    analysis_type: str = "comprehensive"  # grammar, readability, coherence, argument, comprehensive

class AnalysisResponse(BaseModel):
    essay_id: int
    analysis_type: str
    scores: Dict[str, float]
    detailed_analysis: Dict[str, Any]
    recommendations: List[str]
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

