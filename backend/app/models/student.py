"""
Student Model
Student model
"""
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Student(Base):
    __tablename__ = "students"
    
    id = Column(String, primary_key=True, index=True)  # uuid
    student_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    class_id = Column(String, ForeignKey("classes.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    
    # Relationships
    class_obj = relationship("Class", back_populates="students")
    essays = relationship("Essay", back_populates="student")

