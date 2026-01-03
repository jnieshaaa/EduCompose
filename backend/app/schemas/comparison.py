"""
Comparison Analysis Schemas
"""
from pydantic import BaseModel
from typing import List, Optional


class ComparisonHighlight(BaseModel):
    start: int
    end: int
    text: str
    student_index: int


class ComparisonAnalysisRequest(BaseModel):
    essay_texts: List[str]
    student_names: List[str]


class ComparisonAnalysisResponse(BaseModel):
    insights: str
    highlights: List[ComparisonHighlight]
    similarity_score: float

