from pydantic import BaseModel, Field
from typing import List, Optional

class ScoreLevelSchema(BaseModel):
    id: int
    title: str
    points: float
    description: str

class CriteriaRowSchema(BaseModel):
    id: int
    title: str
    scores: List[ScoreLevelSchema]

class GeneratedRubric(BaseModel):
    name: str
    description: str
    grading_intensity: str = "Basic"
    criteria: List[CriteriaRowSchema]

class RubricGenerateRequest(BaseModel):
    title: str
    description: Optional[str] = None

class RubricGenerateResponse(BaseModel):
    suggestions: List[GeneratedRubric]
