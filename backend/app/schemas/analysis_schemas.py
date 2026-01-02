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

class TextAnalysisRequest(BaseModel):
    text: str
    title: Optional[str] = "Untitled Essay"
    analysis_type: str = "comprehensive"  # grammar, readability, coherence, argument, comprehensive
    rubric_id: Optional[str] = None  # Optional rubric ID for rubric-based analysis

class TextAnalysisResponse(BaseModel):
    analysis_type: str
    scores: Dict[str, float]
    detailed_analysis: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    diagnostic_summary: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None
    generated_at: datetime
    processing_time_seconds: Optional[float] = None

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

class PlagiarismMatch(BaseModel):
    url: str
    title: Optional[str] = None
    minwords: Optional[int] = None
    maxwords: Optional[int] = None
    words: Optional[int] = None
    percent: float

class PlagiarismCheckRequest(BaseModel):
    text: str

class PlagiarismCheckResponse(BaseModel):
    is_plagiarized: bool
    plagiarism_percentage: float
    match_count: int
    matches: List[PlagiarismMatch]
    text_length: int
    checked: bool
    error: Optional[str] = None
    message: Optional[str] = None

