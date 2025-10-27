from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Authentication schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# User schemas
class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str = "teacher"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Class schemas
class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClassCreate(ClassBase):
    pass

class ClassResponse(ClassBase):
    id: int
    teacher_id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Student schemas
class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: Optional[str] = None

class StudentCreate(StudentBase):
    class_id: int

class StudentResponse(StudentBase):
    id: int
    class_id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Essay schemas
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

# Analysis schemas
class AnalysisRequest(BaseModel):
    essay_id: int
    analysis_type: str = "comprehensive"  # grammar, style, argument, comprehensive

class AnalysisResponse(BaseModel):
    essay_id: int
    analysis_type: str
    scores: Dict[str, float]
    detailed_analysis: Dict[str, Any]
    recommendations: List[str]
    generated_at: datetime

# Dashboard schemas
class DashboardStats(BaseModel):
    total_essays: int
    total_classes: int
    total_students: int
    recent_essays: List[EssayResponse]
    class_stats: List[Dict[str, Any]]
