"""
Essay Schemas
Request/Response models for essay management
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class EssayBase(BaseModel):
    title: str
    content: str

class EssayCreate(EssayBase):
    student_id: int
    class_id: int

class EssayResponse(EssayBase):
    id: int
    student_id: int
    teacher_id: int
    class_id: int
    submitted_at: datetime
    status: str
    grammar_score: Optional[float] = None
    readability_score: Optional[float] = None
    coherence_score: Optional[float] = None
    argument_strength_score: Optional[float] = None
    overall_score: Optional[float] = None
    grammar_errors: Optional[List[Dict[str, Any]]] = None
    style_issues: Optional[List[Dict[str, Any]]] = None
    argument_analysis: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

