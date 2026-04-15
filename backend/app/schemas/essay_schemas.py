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
    student_id: str  # uuid
    class_id: str

class EssayResponse(EssayBase):
    id: str  # uuid
    student_id: str  # uuid
    teacher_id: str
    class_id: str
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

