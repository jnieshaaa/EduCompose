"""
Essay Model
Essay submission model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    student_id = Column(String, ForeignKey("students.id"))  # uuid
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

