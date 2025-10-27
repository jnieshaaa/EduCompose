from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, List, Dict, Any

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="teacher")  # teacher, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    classes = relationship("Class", back_populates="teacher")
    essays = relationship("Essay", back_populates="teacher")

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    teacher = relationship("User", back_populates="classes")
    students = relationship("Student", back_populates="class_obj")
    essays = relationship("Essay", back_populates="class_obj")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    class_obj = relationship("Class", back_populates="students")
    essays = relationship("Essay", back_populates="student")

class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="submitted")  # submitted, analyzed, reviewed
    
    # Analysis results
    grammar_score = Column(Float)
    readability_score = Column(Float)
    coherence_score = Column(Float)
    argument_strength_score = Column(Float)
    overall_score = Column(Float)
    
    # Detailed analysis
    grammar_errors = Column(JSON)  # List of grammar errors
    style_issues = Column(JSON)  # List of style issues
    argument_analysis = Column(JSON)  # Knowledge graph analysis
    recommendations = Column(JSON)  # AI-generated recommendations
    
    # Relationships
    student = relationship("Student", back_populates="essays")
    teacher = relationship("User", back_populates="essays")
    class_obj = relationship("Class", back_populates="essays")

class AnalysisReport(Base):
    __tablename__ = "analysis_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    essay_id = Column(Integer, ForeignKey("essays.id"))
    report_type = Column(String, nullable=False)  # grammar, style, argument, comprehensive
    content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    essay = relationship("Essay")

# Pydantic models for API
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

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
